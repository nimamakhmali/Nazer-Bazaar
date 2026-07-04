from django.contrib import admin
from apps.cms.models import Page, BlogCategory, Blog, Slider, Gallery, Advertisement

@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'is_published', 'created_at')
    list_editable = ('is_published',)
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'author', 'is_published', 'published_at')
    list_filter = ('is_published', 'category')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}
    autocomplete_fields = ('author', 'category')

@admin.register(Slider)
class SliderAdmin(admin.ModelAdmin):
    list_display = ('title', 'link', 'order', 'is_active')
    list_editable = ('order', 'is_active')

@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'is_active')
    list_editable = ('order', 'is_active')

@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ('title', 'position', 'is_active', 'start_date', 'end_date')
    list_filter = ('position', 'is_active')