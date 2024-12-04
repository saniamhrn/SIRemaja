from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings

class CustomS3Boto3Storage(S3Boto3Storage):
    """
    Custom S3 Storage class to handle media file uploads to S3.
    """
    def __init__(self, *args, **kwargs):
        kwargs['bucket_name'] = settings.AWS_STORAGE_BUCKET_NAME  
        kwargs['custom_domain'] = settings.AWS_S3_CUSTOM_DOMAIN  
        kwargs['file_overwrite'] = settings.AWS_S3_FILE_OVERWRITE 
        kwargs['default_acl'] = settings.AWS_DEFAULT_ACL  

        super().__init__(*args, **kwargs)