from abc import ABC
from datetime import date

from rest_framework import serializers

from Django_Backend import constants
from .models import *
from Django_Backend.constants import TYPE_WEBSITE_VISIT, TYPE_SETTING_CHANGE


class WebsiteCategoryReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = WebsiteCategory
        fields = ('label',)


class PopupSessionSerializer(serializers.ModelSerializer):
    participant = serializers.PrimaryKeyRelatedField(queryset=Participant.objects.all())

    class Meta:
        model = PopupSession
        fields = ('popup_session_id', 'participant', 'popup_opened_time', 'popup_closed_time')


class ModalSessionSerializer(serializers.ModelSerializer):
    participant = serializers.PrimaryKeyRelatedField(queryset=Participant.objects.all())

    class Meta:
        model = ModalSession
        fields = ('modal_session_id', 'participant', 'modal_type', 'info', 'modal_opened_time', 'modal_closed_time')


class ParticipationCodeSerializer(serializers.ModelSerializer):

    class Meta:
        model = ParticipationCode
        fields = ('participation_code_id', 'participation_code', 'is_taken')


class WebsiteCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = WebsiteCategory
        fields = ('website_category_id', 'label', 'description')


class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyCondition
        fields = ('condition_id', 'condition_name')


class ParticipantConditionSerializer(serializers.ModelSerializer):
    condition = ConditionSerializer(read_only=True)

    class Meta:
        model = Participant
        fields = ('participant_id', 'participant_label', 'condition')


class WebsiteVisitSerializer(serializers.ModelSerializer):
    participant = serializers.PrimaryKeyRelatedField(queryset=Participant.objects.all())
    categories = WebsiteCategoryReadSerializer(many=True)

    class Meta:
        model = WebsiteVisit
        fields = ('website_visit_id',
                  'timestamp_start',
                  'num_cookies',
                  'num_third_requests',
                  'is_incognito',
                  'website_id_per_participant',
                  'participant',
                  'is_dnt_enabled',
                  'are_third_party_cookies_allowed',
                  'web_rtcip_policy',
                  'cookie_behavior',
                  'nonpersistent_cookies',
                  'categories')

    def create(self, validated_data):
        print(validated_data)
        categories_data = validated_data.pop('categories')
        website_visit = WebsiteVisit.objects.create(**validated_data)
        num_third_party_requests = website_visit.num_third_requests
        num_new_cookies = website_visit.num_cookies
        if num_new_cookies < 0:
            num_new_cookies = 0
        privacy_points_visits = (num_third_party_requests + num_new_cookies) * -1
        privacy_points_settings = get_privacy_points_for_settings(website_visit)

        PrivacyPointHistoryEntry.objects.create(num_points=privacy_points_visits,
                                                timestamp=website_visit.timestamp_start,
                                                participant=website_visit.participant,
                                                type=TYPE_WEBSITE_VISIT,
                                                website_visit=website_visit)
        PrivacyPointHistoryEntry.objects.create(num_points=privacy_points_settings,
                                                timestamp=website_visit.timestamp_start,
                                                participant = website_visit.participant,
                                                type = TYPE_SETTING_CHANGE,
                                                website_visit=website_visit)
        for category_data in categories_data:
            print(category_data)
            current_category = WebsiteCategory.objects.get(label=category_data['label'])
            WebsiteVisitCategorization.objects.create(website_category=current_category, website_visit=website_visit)

        return website_visit


def get_privacy_points_for_settings(website_visit):
    privacy_points_settings = 0
    if website_visit.is_incognito:
        privacy_points_settings += constants.PRIVACY_POINTS_FOR_INCOGNITO
    if website_visit.is_dnt_enabled:
        privacy_points_settings += constants.PRIVACY_POINTS_FOR_DNT
    if website_visit.are_third_party_cookies_allowed is not None:
        if not website_visit.are_third_party_cookies_allowed:
            privacy_points_settings += constants.PRIVACY_POINTS_FOR_BLOCKING_THIRD_PARTY_COOKIES
    if website_visit.cookie_behavior is not None:
        if website_visit.cookie_behavior == "":
            privacy_points_settings += constants.PRIVACY_POINTS_FOR_BLOCKING_THIRD_PARTY_COOKIES
        elif website_visit.cookie_behavior == "":
            privacy_points_settings += constants.PRIVACY_POINTS_FOR_REJECTING_TRACKERS
        elif website_visit.cookie_behavior == "":
            privacy_points_settings += constants.PRIVACY_POINT_FOR_REJECTING_ALL_COOKIES
    if website_visit.nonpersistent_cookies is not None:
        if website_visit.nonpersistent_cookies:
            privacy_points_settings += constants.PRIVACY_POINTS_FOR_NONPERSISTENT_COOKIES
    if website_visit.num_cookies < 0:
        privacy_points_settings += (-1 * website_visit.num_cookies)
    return privacy_points_settings


class CategorizedDomainSerializer(serializers.ModelSerializer):
    categories = WebsiteCategoryReadSerializer(many=True)

    def create(self, validated_data):
        categories_data = validated_data.pop('categories')
        categorized_domain = CategorizedDomain.objects.create(**validated_data)
        for category_data in categories_data:
            current_category = WebsiteCategory.objects.get(label=category_data['label'])
            WebsiteCategorization.objects.create(website_category=current_category,
                                                 categorized_domain=categorized_domain)


        return categorized_domain


    class Meta:
        model = CategorizedDomain
        fields = ('categorized_domain_id', 'domain', 'categories')


# num website visits to news websites last day and whole study (label = News and Media)
# num website visits to arts and entertainment sites (label = Entertainment)
# num website visits to research/science/education sites (label = Education & Self-Help)
class SingleBoostSerializer(serializers.Serializer):
    participant_id = serializers.IntegerField(allow_null=True)
    num_visits_date = serializers.IntegerField(allow_null=True, required=False)
    date = serializers.DateField()
    num_visits_study = serializers.IntegerField()
    website_label = serializers.CharField()

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass

class NumVisitSerializer(serializers.ModelSerializer):
    num_visits = serializers.IntegerField()

    class Meta:
        model = Participant
        fields= ('num_visits',)


class BoostsSerializer(serializers.Serializer):
    boosts = SingleBoostSerializer(many=True)


# for privacy points for website visits, overall and for settings
# for number of third party requests
# for number of set cookies
class SingleNudgeSerializer(serializers.Serializer):
    min_total = serializers.FloatField()
    max_total = serializers.FloatField()
    avg_total = serializers.FloatField()
    own_value = serializers.FloatField(allow_null=True)
    start_included_date = serializers.DateField()
    end_included_date = serializers.DateField()
    better_than_percent = serializers.FloatField(allow_null=True)
    variable = serializers.CharField()

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass

class NudgesSerializer(serializers.Serializer):
    nudges = SingleNudgeSerializer(many=True)

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass




