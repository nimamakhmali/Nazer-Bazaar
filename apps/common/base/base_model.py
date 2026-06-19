import uuid 

from django.db import models 


class BaseModel(models.Model):
    
    created_at = models.DateTimeField(
        auto_now_add= True,
        verbose_name= 'تاریخ ایجاد'
    )
    
    updated_at = models.DateTimeField(
        auto_now= True,
        verbose_name= 'تاریخ به روزرسانی'
    )
    
    class Meta: 
        abstract = True
        ordering = ['-created_at']
        
        
        
class ActivatetableModel(BaseModel):
    is_active = models.BooleanField(
        default=True,
        verbose_name= 'فعال',
        db_index=True
    )   
    
    class Meta:
        abstract= True
        
    def active(self) -> None:
        self.is_active = True
        self.save(update_fields=['is_active', 'updated_at'])
        
    def deactivate(self) -> None:
        self.is_active = False
        self.save(update_fields=['is_active', 'updated_at']) 
        

class SoftDeleteModel(BaseModel):
    is_deleted= models.BooleanField(
        default=False,
        verbose_name='حذف شده',
        db_index=True
    )           

    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='تاریخ حذف'
    )
    
    class Meta:
        abstract = True

    def soft_delete(self) -> None:
       
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])

    def restore(self) -> None:
        
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])

class UUIDModel(models.Model):
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='شناسه یکتا'
    )
    class Meta:
        abstract = True
        
        