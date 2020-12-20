
from django.db import models



class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class Participant(models.Model):
    participant_label = models.IntegerField(blank=True, null=True)
    condition = models.ForeignKey('StudyCondition', models.DO_NOTHING, db_column='condition', blank=True, null=True)
    participant_id = models.SmallAutoField(primary_key=True)

    class Meta:
        managed = False
        db_table = 'participant'


class PrivacyPointHistoryEntry(models.Model):
    privacy_point_history_entry_id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(blank=True, null=True)
    num_points = models.IntegerField(blank=True, null=True)
    participant = models.ForeignKey(Participant, models.DO_NOTHING, blank=True, null=True)
    type = models.CharField(max_length=50, blank=True, null=True)
    website_visit = models.ForeignKey('WebsiteVisit', models.DO_NOTHING, db_column='website_visit', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'privacy_point_history_entry'


class ParticipationCode(models.Model):
    participation_code_id = models.AutoField(primary_key=True)
    participation_code = models.IntegerField(blank=True, null=True)
    is_taken = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'participation_code'


class StudyCondition(models.Model):
    condition_id = models.SmallAutoField(primary_key=True)
    condition_name = models.CharField(max_length=7, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'study_condition'


class WebsiteCategorization(models.Model):
    website_categorization_id = models.AutoField(primary_key=True)
    categorized_domain = models.ForeignKey('CategorizedDomain', models.DO_NOTHING)
    website_category = models.ForeignKey('WebsiteCategory', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'website_categorization'
        unique_together = (('categorized_domain', 'website_category'),)


class WebsiteCategory(models.Model):
    website_category_id = models.CharField(primary_key=True, max_length=50)
    label = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'website_category'


class WebsiteVisit(models.Model):
    website_visit_id = models.BigAutoField(primary_key=True)
    timestamp_start = models.DateTimeField(blank=True, null=True)
    num_cookies = models.IntegerField(blank=True, null=True)
    participant = models.ForeignKey(Participant, models.DO_NOTHING, blank=True, null=True)
    website_id_per_participant = models.IntegerField(blank=True, null=True)
    is_incognito = models.BooleanField(blank=True, null=True)
    num_third_requests = models.IntegerField(blank=True, null=True)
    is_dnt_enabled = models.BooleanField(db_column='is_DNT_enabled', blank=True, null=True)  # Field name made lowercase.
    are_third_party_cookies_allowed = models.BooleanField(blank=True, null=True)
    web_rtcip_policy = models.CharField(db_column='web_RTCIP_Policy', max_length=50, blank=True, null=True)  # Field name made lowercase.
    cookie_behavior = models.CharField(max_length=50, blank=True, null=True)
    nonpersistent_cookies = models.BooleanField(blank=True, null=True)
    categories = models.ManyToManyField('WebsiteCategory', through='WebsiteVisitCategorization',
                                        related_name='visit_categories')

    class Meta:
        managed = False
        db_table = 'website_visit'


class WebsiteVisitCategorization(models.Model):
    website_visit = models.ForeignKey(WebsiteVisit, models.DO_NOTHING)
    website_visit_categorization_id = models.BigAutoField(primary_key=True)
    website_category = models.ForeignKey(WebsiteCategory, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'website_visit_categorization'


class CategorizedDomain(models.Model):
    categorized_domain_id = models.BigAutoField(primary_key=True)
    domain = models.CharField(unique=True, max_length=500, blank=True, null=True)
    categories = models.ManyToManyField(WebsiteCategory, through='WebsiteCategorization', related_name='domain_categories')

    class Meta:
        managed = False
        db_table = 'categorized_domain'


class PopupSession(models.Model):
    popup_session_id = models.AutoField(primary_key=True)
    participant = models.ForeignKey(Participant, models.DO_NOTHING, blank=True, null=True)
    popup_opened_time = models.DateTimeField(blank=True, null=True)
    popup_closed_time = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'popup_session'


class ModalSession(models.Model):
    modal_session_id = models.BigAutoField(primary_key=True)
    participant = models.ForeignKey('Participant', models.DO_NOTHING, db_column='participant', blank=True, null=True)
    modal_type = models.CharField(max_length=5, blank=True, null=True)
    info = models.CharField(max_length=400, blank=True, null=True)
    modal_opened_time = models.DateTimeField(blank=True, null=True)
    modal_closed_time = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'modal_session'
