# Generated by Django 3.0.5 on 2020-04-29 13:00

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('Django_MA_Backend', '0005_websitevisitcategorization'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='websitecategorization',
            name='categorized_domain',
        ),
        migrations.DeleteModel(
            name='WebsiteVisitCategorization',
        ),
        migrations.DeleteModel(
            name='WebsiteCategorization',
        ),
    ]
