# Generated by Django 3.0.5 on 2020-05-10 12:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Django_MA_Backend', '0007_websitecategorization_websitevisitcategorization'),
    ]

    operations = [
        migrations.CreateModel(
            name='PopupSession',
            fields=[
                ('popup_session_id', models.AutoField(primary_key=True, serialize=False)),
                ('popup_opened_time', models.DateTimeField(blank=True, null=True)),
                ('popup_closed_time', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'popup_session',
                'managed': False,
            },
        ),
    ]
