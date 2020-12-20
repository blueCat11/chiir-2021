# Generated by Django 3.0.5 on 2020-04-18 19:23

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('Django_MA_Backend', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CategorizedDomain',
            fields=[
                ('categorized_domain_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('domain', models.CharField(blank=True, max_length=500, null=True)),
            ],
            options={
                'db_table': 'categorized_domain',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='WebsiteCategorization',
            fields=[
                ('categorized_domain', models.OneToOneField(on_delete=django.db.models.deletion.DO_NOTHING, primary_key=True, serialize=False, to='Django_MA_Backend.CategorizedDomain')),
            ],
            options={
                'db_table': 'website_categorization',
                'managed': False,
            },
        ),
    ]
