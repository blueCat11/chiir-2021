# Generated by Django 3.0.5 on 2020-04-20 16:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Django_MA_Backend', '0003_participant_studycondition'),
    ]

    operations = [
        migrations.CreateModel(
            name='PrivacyPointHistoryEntry',
            fields=[
                ('privacy_point_history_entry_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('timestamp', models.DateTimeField(blank=True, null=True)),
                ('num_points', models.IntegerField(blank=True, null=True)),
            ],
            options={
                'db_table': 'privacy_point_history_entry',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='SettingChangeEntry',
            fields=[
                ('setting_change_entry_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('setting_type', models.CharField(blank=True, max_length=200, null=True)),
                ('orginal_value', models.CharField(blank=True, max_length=50, null=True)),
                ('new_value', models.CharField(blank=True, max_length=50, null=True)),
                ('timestamp', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'setting_change_entry',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='WebsiteVisit',
            fields=[
                ('website_visit_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('timestamp_start', models.DateTimeField(blank=True, null=True)),
                ('timestamp_end', models.DateTimeField(blank=True, null=True)),
                ('num_1_cookies', models.IntegerField(blank=True, null=True)),
                ('num_3_cookies', models.IntegerField(blank=True, null=True)),
                ('website_id_per_participant', models.IntegerField(blank=True, null=True)),
            ],
            options={
                'db_table': 'website_visit',
                'managed': False,
            },
        ),
    ]
