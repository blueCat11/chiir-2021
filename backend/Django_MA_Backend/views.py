import random
from datetime import date, timedelta

from django.db.models import Count, Avg, Min, Max, Sum, Q
from django.utils.datetime_safe import time
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import viewsets, generics, views, status, filters
from rest_framework.response import Response
from rest_framework.utils import json
from rest_framework.views import APIView


from Django_Backend import constants
from Django_Backend.settings import TESTING
from .serializers import *
from .models import WebsiteCategory, Participant, WebsiteVisit, CategorizedDomain, WebsiteCategorization

from base64 import urlsafe_b64encode
import hashlib
import requests
import json
try:
    from urllib import urlencode
except ImportError:
    from urllib.parse import urlencode

access_key = constants.MY_WEBSHRINKER_ACCESS_KEY
secret_key = constants.MY_WEBSHRINKER_SECRET_KEY


class WebsiteCategoryViewSet(viewsets.ModelViewSet):
    queryset = WebsiteCategory.objects.all().order_by('label')
    serializer_class = WebsiteCategorySerializer


class ParticipantViewSet(viewsets.ModelViewSet):
    serializer_class = ParticipantConditionSerializer
    queryset = Participant.objects.all()


class RandomParticipant(APIView):
    def get(self, request, format=None):
        condition = self.request.query_params.get('condition', None)
        if condition is None:
            nonassigned_participants = Participant.objects.all().filter(participant_label=None)
            if len(nonassigned_participants) < 1:
                random_condition = random.randint(1, 3)
                random_participant = Participant.objects.create(condition_id=random_condition, participant_label=-1)
            else:
                random_participant = random.sample(list(nonassigned_participants), 1)[0]
                random_participant.participant_label = -1
                random_participant.save()
            serializer = ParticipantConditionSerializer(random_participant)
            return Response(serializer.data)
        else:
            nonassigned_participants = Participant.objects.filter(participant_label=None, condition_id=condition)
            if len(nonassigned_participants) < 1:
                random_participant = Participant.objects.create(condition_id=condition, participant_label = -1)
            else:
                random_participant = random.sample(list(nonassigned_participants), 1)[0]
                random_participant.participant_label = -1
                random_participant.save()
            serializer = ParticipantConditionSerializer(random_participant)
            return Response(serializer.data)


class RandomParticipationCode(APIView):

    def get(self, request, format=None):
        nontaken_participation_codes = ParticipationCode.objects.all().filter(is_taken=False)
        if len(nontaken_participation_codes) < 1:
            return Response({"Fail": constants.PARTICIPATION_CODE_ERROR_MSG}, status=status.HTTP_400_BAD_REQUEST)
        else:
            random_participation_code = random.sample(list(nontaken_participation_codes), 1)[0]
            random_participation_code.is_taken = True
            random_participation_code.save()
            serializer = ParticipationCodeSerializer(random_participation_code)
            return Response(serializer.data)



class WebsiteVisitViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteVisitSerializer
    queryset = WebsiteVisit.objects.all()


class PopupSessionViewSet(viewsets.ModelViewSet):
    serializer_class = PopupSessionSerializer
    queryset = PopupSession.objects.all()


class ModalSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ModalSessionSerializer
    queryset = ModalSession.objects.all()


class WebsiteCategorizationViewSet(viewsets.ModelViewSet):
    serializer_class = CategorizedDomainSerializer
    queryset = CategorizedDomain.objects.all()

    def list(self, request):
        queryset = CategorizedDomain.objects.all()
        domains = self.request.query_params.get('domains', None)
        #print(domains)
        if domains is not None:
            # Convert parameter string to list of integers
            domains = [x for x in domains.split(',')]
            for individual_domain in domains:
                domain, created = CategorizedDomain.objects.get_or_create(domain=individual_domain)
                if created:
                    #print(created)

                    if TESTING:
                        result_json_string = '''{
                                                    "data": [
                                                        {
                                                            "categories": [
                                                                {
                                                                    "id": "adult",
                                                                    "label": "Adult"
                                                                },
                                                                {
                                                                    "id": "informationtech",
                                                                    "label": "Information Technology"
                                                                }
                                                            ],
                                                            "url": "webshrinker.com"
                                                        }
                                                    ]
                                                }'''
                        result_data = json.loads(result_json_string)
                    else:
                        individual_domain_bytes = individual_domain.encode(encoding="utf-8")
                        result_data = get_webshrinker_categories_for_domain(individual_domain_bytes)
                    if result_data is not None:
                        data = result_data.get("data", None)
                        if data is not None:
                            categories = data[0].get("categories")
                            #print(categories)
                            for category in categories:
                                category_id = category['id']
                                if category_id in constants.DONT_TRACK_IDS:
                                    current_category = WebsiteCategory.objects.get(website_category_id=constants.REPLACEMENT_CATEGORY_ID)
                                else:
                                    current_category = WebsiteCategory.objects.get(website_category_id=category['id'])

                                categorization = WebsiteCategorization.objects.create(website_category=current_category,
                                                                     categorized_domain=domain)

                        else:
                            # No data also means the categorization failed
                            handleNoWebshrinkerResults(domain)
                    else:
                        #This happens when a categorization fails
                        handleNoWebshrinkerResults(domain)

            queryset = queryset.filter(domain__in=domains)

        serializer = CategorizedDomainSerializer(queryset, many=True)
        return Response(serializer.data)

# If Webshrinker doesn't return a response, the site is categorized as uncategorized
def handleNoWebshrinkerResults(domain):
    WebsiteCategorization.objects.create(website_category=constants.UNCATEGORIZED_CATEGORY_ID,
                                                          categorized_domain=domain)

# This returns an url which can be sent to the Webshrinker API to categorize a domain
def webshrinker_categories_v3(access_key, secret_key, url=b"", params={}):
    params['key'] = access_key

    request = "categories/v3/{}?{}".format(urlsafe_b64encode(url).decode('utf-8'), urlencode(params, True))
    request_to_sign = "{}:{}".format(secret_key, request).encode('utf-8')
    #print("webshrinker_request", request)
    #print("webshrinker_request_to_sign", request_to_sign)
    signed_request = hashlib.md5(request_to_sign).hexdigest()
    #print("webshrinker_signed_request", signed_request)

    return "https://api.webshrinker.com/{}&hash={}".format(request, signed_request)

# This sends a request to the webshrinker API and returns a set of categorized domains
def get_webshrinker_categories_for_domain(domain):
    api_url = webshrinker_categories_v3(access_key, secret_key, url=domain, params={"taxonomy":"webshrinker"})
    #print("url_for_webshrinker", api_url)
    response = requests.get(api_url)
    #print(response)

    status_code = response.status_code
    #print("status_code", status_code)
    data = response.json()
    #print("response_data", data)

    if status_code == 200:
        # Do something with the JSON response
        #print(json.dumps(data, indent=4, sort_keys=True))
        return data
    elif status_code == 202:
        # The website is being visited and the categories will be updated shortly
        #print(json.dumps(data, indent=4, sort_keys=True))
        time.sleep(2)
        response = requests.get(api_url)
        status_code = response.status_code
        data = response.json()
        if status_code == 200:
            return data
        return None
    elif status_code == 400:
        # Bad or malformed HTTP request
        print("Bad or malformed HTTP request")
        #print(json.dumps(data, indent=4, sort_keys=True))

    elif status_code == 401:
        # Unauthorized
        print("Unauthorized - check your access and secret key permissions")
        #print(json.dumps(data, indent=4, sort_keys=True))

    elif status_code == 402:
        # Request limit reached
        print("Account request limit reached")
        #print(json.dumps(data, indent=4, sort_keys=True))

    else:
        # General error occurred
        print("A general error occurred, try the request again")
    return None


# for privacy points for website visits, overall and for settings
# for number of third party requests
# for number of set cookies
class ParticipantNudgeDataView(APIView):
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['participant_id']

    def get(self, request, format=None):
        yesterday = date.today() - timedelta(days=1)
        total_data_list = []
        participant_id = self.request.query_params.get('participant_id', None)

        if participant_id is not None:

            total_data_list = get_privacypoints_nudges(participant_id, yesterday, total_data_list)
            total_data_list = get_3rd_party_nudges(participant_id, yesterday, total_data_list,
                                                   constants.VARIABLE_NUM_3_REQUESTS)
            total_data_list = get_cookies_nudges(participant_id, yesterday, total_data_list,
                                                 constants.VARIABLE_NUM_COOKIES)

            total_nudges_serializer = NudgesSerializer({"nudges": total_data_list})

            if total_nudges_serializer.is_valid:
                return Response(total_nudges_serializer.data)
            else:
                print(total_nudges_serializer.errors)
                return Response("error")
        else:
            return Response("error")



# returns zero if no results in queryset
# for further processing in next query
def get_own_value(own_value_queryset):
    if own_value_queryset:
        if own_value_queryset[0].own_value is None:
            return 0
        else:
            return own_value_queryset[0].own_value
    else:
        return 0

# returns None if no results in queryset
# for value for frontend
def get_own_value_with_null(own_value_queryset):
    if own_value_queryset:
        if own_value_queryset[0].own_value is None:
            return None
        else:
            return own_value_queryset[0].own_value
    else:
        return None

def get_3rd_party_nudges(participant_id, yesterday, total_data_list, variable):
    own_value_3rd_party_study = Participant.objects.filter(participant_id=participant_id).annotate(own_value=Sum('websitevisit__num_third_requests') / Count('websitevisit'))
    own_value = get_own_value_with_null(own_value_3rd_party_study)


    if (own_value is None):
        aggregate_3rd_party_study = Participant.objects.annotate(
            n3_study=Sum('websitevisit__num_third_requests') / Count('websitevisit')
        ).aggregate(min_total=Min('n3_study'),
                    max_total=Max('n3_study'),
                    avg_total=Avg('n3_study'),
                    num_participants=Count('participant_id', distinct=True, filter=Q(n3_study__isnull=False)),
                    num_worse_own=Count('participant_id',
                                        distinct=True,
                                        filter=Q(n3_study__gt=0)))

        total_data_list = get_nudges(own_value_3rd_party_study, own_value, aggregate_3rd_party_study,
                                     yesterday, constants.TIME_PERIOD_STUDY, variable,
                                     total_data_list)
    else:

        aggregate_3rd_party_study = Participant.objects.annotate(
            n3_study=Sum('websitevisit__num_third_requests') / Count('websitevisit')
        ).aggregate(min_total=Min('n3_study'),
                    max_total=Max('n3_study'),
                    avg_total=Avg('n3_study'),
                    num_participants=Count('participant_id', distinct=True, filter=Q(n3_study__isnull=False)),
                    num_worse_own=Count('participant_id',
                                          distinct=True,
                                          filter=Q(n3_study__gt=own_value)))

        total_data_list = get_nudges(own_value_3rd_party_study, own_value, aggregate_3rd_party_study,
                                     yesterday, constants.TIME_PERIOD_STUDY, variable,
                                     total_data_list)

    own_value_3rd_party_date = Participant.objects.filter(participant_id=participant_id,
                                                          websitevisit__timestamp_start__day=yesterday.day,
                                                          websitevisit__timestamp_start__month=yesterday.month,
                                                          websitevisit__timestamp_start__year=yesterday.year) \
        .annotate(own_value=Sum('websitevisit__num_third_requests') / Count('websitevisit'))
    own_value_date = get_own_value_with_null(own_value_3rd_party_date)

    if own_value_date is None:
        aggregate_3rd_party_date = Participant.objects.filter(websitevisit__timestamp_start__day=yesterday.day,
                                                              websitevisit__timestamp_start__month=yesterday.month,
                                                              websitevisit__timestamp_start__year=yesterday.year
                                                              ).annotate(
            n3_study=Sum('websitevisit__num_third_requests') / Count('websitevisit')).aggregate(
            min_total=Min('n3_study'),
            max_total=Max('n3_study'),
            avg_total=Avg('n3_study'),
            num_participants=Count('participant_id', distinct=True, filter=Q(n3_study__isnull=False)),
            num_worse_own=Count('participant_id',
                                distinct=True,
                                filter=Q(n3_study__gt=0)))

        total_data_list = get_nudges(own_value_3rd_party_date, own_value_date, aggregate_3rd_party_date,
                                     yesterday, constants.TIME_PERIOD_DATE, variable,
                                     total_data_list)
    else:
        aggregate_3rd_party_date = Participant.objects.filter(websitevisit__timestamp_start__day=yesterday.day,
                                                              websitevisit__timestamp_start__month=yesterday.month,
                                                              websitevisit__timestamp_start__year=yesterday.year
                                                                   ).annotate(
            n3_study=Sum('websitevisit__num_third_requests') / Count('websitevisit')).aggregate(
            min_total=Min('n3_study'),
            max_total=Max('n3_study'),
            avg_total=Avg('n3_study'),
            num_participants=Count('participant_id', distinct=True, filter=Q(n3_study__isnull=False)),
            num_worse_own=Count('participant_id',
                                  distinct=True,
                                  filter=Q(n3_study__gt=own_value_date)))

        total_data_list = get_nudges(own_value_3rd_party_date, own_value_date, aggregate_3rd_party_date,
                                     yesterday, constants.TIME_PERIOD_DATE, variable,
                                     total_data_list)
    return total_data_list


def get_cookies_nudges(participant_id, yesterday, total_data_list, variable):
    own_value_cookies_study = Participant.objects.filter(participant_id=participant_id).annotate(
        own_value=Sum('websitevisit__num_cookies') / Count('websitevisit'))
    own_value = get_own_value_with_null(own_value_cookies_study)

    if own_value is None:
        aggregate_cookies_study = Participant.objects.annotate(
            nc_study=Sum('websitevisit__num_cookies') / Count('websitevisit')
        ).aggregate(min_total=Min('nc_study'),
                    max_total=Max('nc_study'),
                    avg_total=Avg('nc_study'),
                    num_participants=Count('participant_id', distinct=True, filter=Q(nc_study__isnull=False)),
                    num_worse_own=Count('participant_id',
                                          distinct=True,
                                          filter=Q(nc_study__gt=0)))

        total_data_list = get_nudges(own_value_cookies_study, own_value, aggregate_cookies_study,
                                     yesterday, constants.TIME_PERIOD_STUDY, variable,
                                     total_data_list)
    else:
        aggregate_cookies_study = Participant.objects.annotate(
            nc_study=Sum('websitevisit__num_cookies') / Count('websitevisit')
        ).aggregate(min_total=Min('nc_study'),
                    max_total=Max('nc_study'),
                    avg_total=Avg('nc_study'),
                    num_participants=Count('participant_id', distinct=True, filter=Q(nc_study__isnull=False)),
                    num_worse_own=Count('participant_id',
                                        distinct=True,
                                        filter=Q(nc_study__gt=own_value)))

        total_data_list = get_nudges(own_value_cookies_study, own_value, aggregate_cookies_study,
                                     yesterday, constants.TIME_PERIOD_STUDY, variable,
                                     total_data_list)

    own_value_cookies_date = Participant.objects.filter(participant_id=participant_id,
                                                          websitevisit__timestamp_start__day=yesterday.day,
                                                          websitevisit__timestamp_start__month=yesterday.month,
                                                          websitevisit__timestamp_start__year=yesterday.year) \
        .annotate(own_value=Sum('websitevisit__num_cookies') / Count('websitevisit'))
    own_value_date = get_own_value_with_null(own_value_cookies_date)
    if own_value_date is None:
        aggregate_cookies_date = Participant.objects.filter(websitevisit__timestamp_start__day=yesterday.day,
                                                              websitevisit__timestamp_start__month=yesterday.month,
                                                              websitevisit__timestamp_start__year=yesterday.year
                                                              ).annotate(nc_study=Sum('websitevisit__num_cookies') / Count('websitevisit')
                                                                         ).aggregate(min_total=Min('nc_study'),
                                                                                     max_total=Max('nc_study'),
                                                                                     avg_total=Avg('nc_study'),
                                                                                     num_participants=Count('participant_id',
                                                                                                            distinct=True,
                                                                                                            filter=Q(nc_study__isnull=False)),
                                                                                     num_worse_own=Count('participant_id',
                                                                                                           distinct=True,
                                                                                                           filter=Q(nc_study__gt=0)))

        total_data_list = get_nudges(own_value_cookies_date, own_value_date, aggregate_cookies_date,
                                     yesterday, constants.TIME_PERIOD_DATE, variable,
                                     total_data_list)
    else:
        aggregate_cookies_study = Participant.objects.annotate(
            nc_study=Sum('websitevisit__num_cookies') / Count('websitevisit')
        ).aggregate(min_total=Min('nc_study'),
                    max_total=Max('nc_study'),
                    avg_total=Avg('nc_study'),
                    num_participants=Count('participant_id', distinct=True, filter=Q(nc_study__isnull=False)),
                    num_worse_own=Count('participant_id',
                                        distinct=True,
                                        filter=Q(nc_study__gt=own_value)))

        total_data_list = get_nudges(own_value_cookies_study, own_value, aggregate_cookies_study,
                                     yesterday, constants.TIME_PERIOD_STUDY, variable,
                                     total_data_list)
    return total_data_list


def get_privacypoints_nudges(participant_id, yesterday, total_data_list):
    #participant_id, privacypoint_type, yesterday, variable, total_data_list
    total_data_list = get_privacypoints_nudges_total_study_duration(participant_id, constants.TYPE_WEBSITE_VISIT,
                                                                     yesterday, constants.VARIABLE_PRIVACY_POINTS_VISITS,
                                                                     total_data_list)
    total_data_list = get_privacypoints_nudges_total_study_duration(participant_id, constants.TYPE_SETTING_CHANGE,
                                                                    yesterday, constants.VARIABLE_PRIVACY_POINTS_SETTINGS,
                                                                    total_data_list)

    total_data_list = get_privacypoints_nudges_total_study_duration(participant_id, constants.TYPE_BOTH, yesterday,
                                                                    constants.VARIABLE_PRIVACY_POINTS_BOTH,
                                                                    total_data_list)

    total_data_list = get_privacypoints_nudges_one_day(participant_id, constants.TYPE_WEBSITE_VISIT, yesterday,
                                                       constants.VARIABLE_PRIVACY_POINTS_VISITS, total_data_list)

    total_data_list = get_privacypoints_nudges_one_day(participant_id, constants.TYPE_SETTING_CHANGE, yesterday,
                                                       constants.VARIABLE_PRIVACY_POINTS_SETTINGS, total_data_list)

    total_data_list = get_privacypoints_nudges_one_day(participant_id, constants.TYPE_BOTH, yesterday,
                                                       constants.VARIABLE_PRIVACY_POINTS_BOTH, total_data_list)

    return total_data_list


# gets the aggregations for those privacy points related nudges about one single day in the study
def get_privacypoints_nudges_one_day(participant_id, privacypoint_type, yesterday, variable, total_data_list):
    if privacypoint_type != constants.TYPE_BOTH:
        own_value_privacy_points_date = Participant.objects.filter(privacypointhistoryentry__type=privacypoint_type,
                                                                   participant_id=participant_id,
                                                                   privacypointhistoryentry__timestamp__day=yesterday.day,
                                                                   privacypointhistoryentry__timestamp__month=yesterday.month,
                                                                   privacypointhistoryentry__timestamp__year=yesterday.year) \
            .annotate(own_value=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry'))
        own_value_date = get_own_value_with_null(own_value_privacy_points_date)

        if own_value_date is None:
            aggregate_privacy_points_date = Participant.objects.filter(privacypointhistoryentry__type=privacypoint_type,
                                                                       privacypointhistoryentry__timestamp__day=yesterday.day,
                                                                       privacypointhistoryentry__timestamp__month=yesterday.month,
                                                                       privacypointhistoryentry__timestamp__year=yesterday.year
                                                                       ).annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')).aggregate(min_total=Min('pp_study'),
                        max_total=Max('pp_study'),
                        avg_total=Avg('pp_study'),
                        num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                        num_worse_own=Count('participant_id',
                                              distinct=True,
                                              filter=Q(pp_study__lt=0)))

        else:
            aggregate_privacy_points_date = Participant.objects.filter(privacypointhistoryentry__type=privacypoint_type,
                                                                       privacypointhistoryentry__timestamp__day=yesterday.day,
                                                                       privacypointhistoryentry__timestamp__month=yesterday.month,
                                                                       privacypointhistoryentry__timestamp__year=yesterday.year
                                                                       ).annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')).aggregate(
                min_total=Min('pp_study'),
                max_total=Max('pp_study'),
                avg_total=Avg('pp_study'),
                num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                num_worse_own=Count('participant_id',
                                    distinct=True,
                                    filter=Q(pp_study__lt=own_value_date)))

    else:
        own_value_privacy_points_date = Participant.objects.filter(participant_id=participant_id,
                                                                   privacypointhistoryentry__timestamp__day=yesterday.day,
                                                                   privacypointhistoryentry__timestamp__month=yesterday.month,
                                                                   privacypointhistoryentry__timestamp__year=yesterday.year) \
            .annotate(own_value=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry'))
        own_value_date = get_own_value_with_null(own_value_privacy_points_date)

        if own_value_date is None:
            aggregate_privacy_points_date = Participant.objects.filter(privacypointhistoryentry__timestamp__day=yesterday.day,
                                                                       privacypointhistoryentry__timestamp__month=yesterday.month,
                                                                       privacypointhistoryentry__timestamp__year=yesterday.year
                                                                       ).annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')).aggregate(
                min_total=Min('pp_study'),
                max_total=Max('pp_study'),
                avg_total=Avg('pp_study'),
                num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                num_worse_own=Count('participant_id',
                                      distinct=True,
                                      filter=Q(pp_study__lt=0)))

        else:
            aggregate_privacy_points_date = Participant.objects.filter(
                privacypointhistoryentry__timestamp__day=yesterday.day,
                privacypointhistoryentry__timestamp__month=yesterday.month,
                privacypointhistoryentry__timestamp__year=yesterday.year
                ).annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')).aggregate(
                min_total=Min('pp_study'),
                max_total=Max('pp_study'),
                avg_total=Avg('pp_study'),
                num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                num_worse_own=Count('participant_id',
                                    distinct=True,
                                    filter=Q(pp_study__lt=own_value_date)))


    # own_value_queryset, own_value, aggregate, yesterday, time_period, variable, total_data_list
    total_data_list = get_nudges(own_value_privacy_points_date, own_value_date, aggregate_privacy_points_date,
                                     yesterday, constants.TIME_PERIOD_DATE, variable,
                                     total_data_list)
    return total_data_list


# gets the aggregations for those privacy points related nudges, about the whole duration of the study
def get_privacypoints_nudges_total_study_duration(participant_id, privacypoint_type, yesterday, variable, total_data_list):
    if privacypoint_type != constants.TYPE_BOTH:
        own_value_privacy_points_study = Participant.objects.filter(privacypointhistoryentry__type=privacypoint_type,
                                                                    participant_id=participant_id
                                                                    ).annotate(
            own_value=Sum('privacypointhistoryentry__num_points'
                          ) / Count('privacypointhistoryentry')
        )
        own_value = get_own_value_with_null(own_value_privacy_points_study)
        if own_value is None:
            aggregate_privacy_points_study = Participant.objects.filter(privacypointhistoryentry__type=privacypoint_type
                                                                        ).annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')
            ).aggregate(min_total=Min('pp_study'),
                        max_total=Max('pp_study'),
                        avg_total=Avg('pp_study'),
                        num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                        num_worse_own=Count('participant_id',
                                              distinct=True,
                                              filter=Q(pp_study__lt=0)))
        else:
            aggregate_privacy_points_study = Participant.objects.filter(privacypointhistoryentry__type=privacypoint_type
                                                                        ).annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')
            ).aggregate(min_total=Min('pp_study'),
                        max_total=Max('pp_study'),
                        avg_total=Avg('pp_study'),
                        num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                        num_worse_own=Count('participant_id',
                                            distinct=True,
                                            filter=Q(pp_study__lt=own_value)))
    else:
        own_value_privacy_points_study = Participant.objects.filter(participant_id=participant_id).annotate(
            own_value=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry'))
        own_value = get_own_value_with_null(own_value_privacy_points_study)

        if own_value is None:
            aggregate_privacy_points_study = Participant.objects.annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')
            ).aggregate(min_total=Min('pp_study'),
                        max_total=Max('pp_study'),
                        avg_total=Avg('pp_study'),
                        num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                        num_worse_own=Count('participant_id',
                                              distinct=True,
                                              filter=Q(pp_study__lt=0)))
        else:
            aggregate_privacy_points_study = Participant.objects.annotate(
                pp_study=Sum('privacypointhistoryentry__num_points') / Count('privacypointhistoryentry')
            ).aggregate(min_total=Min('pp_study'),
                        max_total=Max('pp_study'),
                        avg_total=Avg('pp_study'),
                        num_participants=Count('participant_id', distinct=True, filter=Q(pp_study__isnull=False)),
                        num_worse_own=Count('participant_id',
                                            distinct=True,
                                            filter=Q(pp_study__lt=own_value)))

    total_data_list = get_nudges(own_value_privacy_points_study, own_value, aggregate_privacy_points_study,
                                 yesterday, constants.TIME_PERIOD_STUDY, variable,
                                 total_data_list)
    return total_data_list


def get_nudges(own_value_queryset, own_value, aggregate, yesterday, time_period, variable, total_data_list):
    aggregate["own_value"] = own_value
    if time_period == "study":
        aggregate["start_included_date"] = constants.STUDY_START
    elif time_period == "date":
        aggregate["start_included_date"] = yesterday
    aggregate["end_included_date"] = yesterday
    aggregate["variable"] = variable
    num_participants = aggregate["num_participants"]
    num_worse_own = aggregate["num_worse_own"]

    if num_participants == 0:
        aggregate["better_than_percent"] = None
    elif num_participants == 1:
        aggregate["better_than_percent"] = 0
    elif num_participants == 2:
        aggregate["better_than_percent"] = 1.0
    else:
        aggregate["better_than_percent"] = num_worse_own / (num_participants - 1)

    # should be: 0 participants - 0 percent
    # 1 participant - 0 percent
    # 2 participants - 100 percent
    # more participants num_worse / num_participants - 1
    # study total, additional check if value

    aggregate_serializer = SingleNudgeSerializer(aggregate)
    total_data_list.append(aggregate_serializer.data)
    return total_data_list

def get_website_visit_related_boosts(queryset, day_to_filter, category_label, category_total_data_list,
                                     all_participants=None):
    if all_participants is None:
        all_participants = []
    visits_total = queryset.annotate(num_visits=Count('websitevisit', distinct=True))
    visits_that_day = queryset.filter(websitevisit__timestamp_start__day=day_to_filter.day,
                                      websitevisit__timestamp_start__month=day_to_filter.month,
                                      websitevisit__timestamp_start__year=day_to_filter.year).annotate(
        num_visits=Count('websitevisit', distinct=True))


    visits_total_dict = {}
    visits_that_day_dict = {}
    if visits_that_day:
        for participant in visits_that_day:
            if participant:
                try:
                    num_visits = participant.num_visits
                except AttributeError:
                    num_visits = 0
                #visits = NumVisitSerializer({'num_visits': num_visits})
                visits_that_day_dict.update({str(participant.participant_id): num_visits})
            else:
                print("landed on else")

    participants_with_data = []
    if visits_total:
        for participant in visits_total:
            num_visits = participant.num_visits
            visits = NumVisitSerializer({'num_visits': num_visits})
            visits_total_dict.update({str(participant.participant_id): visits.data})
            participants_visits_date = visits_that_day_dict.get(str(participant.participant_id), 0)
            category_total_data = {"num_visits_study": num_visits,
                               "num_visits_date": participants_visits_date,
                               "date": day_to_filter,
                               "website_label": category_label,
                               "participant_id": participant.participant_id}
            category_total_data_list.append(category_total_data)
            participants_with_data.append(participant)

    for participant in all_participants:
        if participant not in participants_with_data:
            category_total_data_list.append({"num_visits_study": 0,
                                             "num_visits_date": 0,
                                             'date': day_to_filter,
                                             'website_label': category_label,
                                             'participant_id': participant.participant_id})
    return category_total_data_list


class ParticipantBoostDataView(APIView):
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['participant_id']

    def get(self, request, format=None):
        yesterday = date.today() - timedelta(days = 1)
        yesterday = date(day=29, month=4, year=2020) # for testing purposes

        participant_id = self.request.query_params.get('participant_id', None)

        if participant_id is not None:
            news_queryset = Participant.objects.filter(participant_id=participant_id,
                websitevisit__categories__website_category_id__contains="business")
            entertainment_queryset = Participant.objects.filter(participant_id=participant_id,
                websitevisit__categories__website_category_id__contains="entertainment")
            education_queryset = Participant.objects.filter(participant_id=participant_id,
                websitevisit__categories__website_category_id__contains="education")

            current_participant = Participant.objects.filter(participant_id=participant_id)
            total_data_list = get_website_visit_related_boosts(news_queryset, yesterday, constants.NEWS_LABEL, [],
                                                                    current_participant)
            total_data_list = get_website_visit_related_boosts(entertainment_queryset, yesterday, constants.ENTERTAINMENT_LABEL,
                                                                    total_data_list, current_participant)
            total_data_list = get_website_visit_related_boosts(education_queryset, yesterday,
                                                                    constants.EDUCATION_LABEL,
                                                                    total_data_list, current_participant)
        else:
            news_queryset = Participant.objects.filter(
                websitevisit__categories__website_category_id__contains="business")
            entertainment_queryset = Participant.objects.filter(
                websitevisit__categories__website_category_id__contains="entertainment")
            education_queryset = Participant.objects.filter(
                websitevisit__categories__website_category_id__contains="education")
            all_participants = Participant.objects.all()

            total_data_list = get_website_visit_related_boosts(news_queryset, yesterday, constants.NEWS_LABEL, [], all_participants)
            total_data_list = get_website_visit_related_boosts(entertainment_queryset, yesterday, constants.ENTERTAINMENT_LABEL, total_data_list, all_participants)
            total_data_list = get_website_visit_related_boosts(education_queryset, yesterday, constants.EDUCATION_LABEL, total_data_list, all_participants)

        total_boosts_serializer = BoostsSerializer(data={"boosts":total_data_list})
        if total_boosts_serializer.is_valid():
            return Response(total_boosts_serializer.data)
        else:
           #print (total_boosts_serializer.errors)
           return Response("error")

