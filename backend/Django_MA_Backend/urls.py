from django.urls import include, path
from rest_framework import routers
from . import views

router = routers.DefaultRouter()
router.register('website_categories', views.WebsiteCategoryViewSet)
router.register('participants', views.ParticipantViewSet)
router.register('website_visits', views.WebsiteVisitViewSet)
router.register('website_categorizations', views.WebsiteCategorizationViewSet)
router.register('popup_sessions', views.PopupSessionViewSet)
router.register('modal_sessions', views.ModalSessionViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path('random_participant/', views.RandomParticipant.as_view()),
    path('study_boosts/', views.ParticipantBoostDataView.as_view()),
    path('study_nudges/', views.ParticipantNudgeDataView.as_view()),
    path('participation_code/', views.RandomParticipationCode.as_view()),
    path('api-auth/', include('rest_framework.urls', namespace = 'rest_framework'))
]