from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_alter_authrefreshsession_token_hash"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentation",
            name="file",
            field=models.FileField(blank=True, null=True, upload_to="documentation/"),
        ),
    ]
