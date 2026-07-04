from rest_framework import serializers
from apps.cms.models import Page, BlogCategory, Blog, Slider, Gallery, Advertisement

# ─── Page Serializers ────────────────────────────────────────────────────────
class PageListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'is_published', 'created_at']

class PageDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'content', 'is_published', 'created_at', 'updated_at']

class PageCreateUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    is_published = serializers.BooleanField(required=False, default=True)

# ─── Blog Serializers ────────────────────────────────────────────────────────
class BlogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug']

class BlogListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = Blog
        fields = ['id', 'title', 'slug', 'category_name', 'author_name', 'summary', 'image', 'published_at']

class BlogDetailSerializer(serializers.ModelSerializer):
    category = BlogCategorySerializer(read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = Blog
        fields = ['id', 'title', 'slug', 'category', 'author_name', 'summary', 'content', 'image', 'is_published', 'published_at', 'created_at']

class BlogCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    category_id = serializers.IntegerField()
    summary = serializers.CharField()
    content = serializers.CharField()
    image = serializers.ImageField()
    is_published = serializers.BooleanField(required=False, default=False)

# ─── Slider & Gallery Serializers ────────────────────────────────────────────
class SliderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slider
        fields = ['id', 'title', 'subtitle', 'image', 'link', 'order']

class GallerySerializer(serializers.ModelSerializer):
    class Meta:
        model = Gallery
        fields = ['id', 'title', 'image', 'description', 'order']

# ─── Advertisement Serializers ───────────────────────────────────────────────
class AdvertisementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Advertisement
        fields = ['id', 'title', 'image', 'link', 'position']