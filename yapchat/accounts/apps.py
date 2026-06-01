from django.apps import AppConfig


class AccountsConfig(AppConfig):
    # default_auto_field is a setting that specifies the type of primary key to use for models in this app.
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Import the signals module to ensure that signal handlers are registered when the app is ready.
        import accounts.signals


