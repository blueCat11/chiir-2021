# Generated by Django 3.0.5 on 2020-04-29 13:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Django_MA_Backend', '0006_auto_20200429_1500'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebsiteCategorization',
            fields=[
                ('website_categorization_id', models.AutoField(primary_key=True, serialize=False)),
            ],
            options={
                'db_table': 'website_categorization',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='WebsiteVisitCategorization',
            fields=[
                ('website_visit_categorization_id', models.BigAutoField(primary_key=True, serialize=False)),
            ],
            options={
                'db_table': 'website_visit_categorization',
                'managed': False,
            },
        ),
    ]
