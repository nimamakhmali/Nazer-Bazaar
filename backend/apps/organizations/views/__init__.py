from .province_office_views import (
    ProvinceOfficeListCreateView,
    ProvinceOfficeDetailView,
    ProvinceOfficeAssignManagerView,
)
from .chamber_views import (
    ChamberListCreateView,
    ChamberDetailView,
    ChamberUnionsView,
    ChamberAssignManagerView,
)
from .union_views import (
    UnionListCreateView,
    UnionDetailView,
    UnionToggleActiveView,
    UnionAssignManagerView,
)

__all__ = [
    'ProvinceOfficeListCreateView',
    'ProvinceOfficeDetailView',
    'ProvinceOfficeAssignManagerView',
    'ChamberListCreateView',
    'ChamberDetailView',
    'ChamberUnionsView',
    'ChamberAssignManagerView',
    'UnionListCreateView',
    'UnionDetailView',
    'UnionToggleActiveView',
    'UnionAssignManagerView',
]