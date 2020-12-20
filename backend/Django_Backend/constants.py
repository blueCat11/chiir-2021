import datetime

TYPE_WEBSITE_VISIT = "websiteVisit"
TYPE_SETTING_CHANGE = "setting"
TYPE_BOTH = ""

DONT_TRACK_IDS = ["adult", "illegalcontent"]
PERHAPS_DONT_TRACK_IDS = ["cryptomining", "deceptive", "hacking", "malicious"]
REPLACEMENT_CATEGORY_ID = "uncategorized"
UNCATEGORIZED_CATEGORY_ID = "uncategorized"

EDUCATION_LABEL = "Education & Self-Help"
NEWS_LABEL = "News and Media"
ENTERTAINMENT_LABEL = "Entertainment"

#TODO change with own data
STUDY_START = datetime.date(year=2020, month=5, day=25)

TIME_PERIOD_STUDY = "study"
TIME_PERIOD_DATE = "date"

VARIABLE_PRIVACY_POINTS_VISITS = "PrivacyPoints_WebsiteVisits"
VARIABLE_PRIVACY_POINTS_SETTINGS = "PrivacyPoints_SettingChange"
VARIABLE_PRIVACY_POINTS_BOTH = "PrivacyPoints_Total"
VARIABLE_NUM_3_REQUESTS = "Num3rdPartyRequests"
VARIABLE_NUM_COOKIES = "NumCookies"

# TODO change with own data (if wanted)
PRIVACY_POINTS_FOR_INCOGNITO = 2
PRIVACY_POINTS_FOR_DELETING_HISTORY = 25
PRIVACY_POINTS_FOR_BLOCKING_THIRD_PARTY_COOKIES = 3
PRIVACY_POINTS_FOR_DNT = 1
PRIVACY_POINTS_FOR_NONPERSISTENT_COOKIES = 1
PRIVACY_POINTS_FOR_REJECTING_TRACKERS = 2
PRIVACY_POINT_FOR_REJECTING_ALL_COOKIES = 5

# TODO change with own data
MY_WEBSHRINKER_ACCESS_KEY = ''
MY_WEBSHRINKER_SECRET_KEY = ''

# TODO change with own data (if English necessary)
# For English: Replace this with "Sorry, there were more requests for participation confirmation than participants"
PARTICIPATION_CODE_ERROR_MSG = "Es wurden bereits die gleiche Menge Teilnahmebestätigungscodes wie Teilnehmer ausgegeben."