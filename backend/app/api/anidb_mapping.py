"""
AniDB mapping API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..services.anidb_mapping_service import AniDBMappingService
from ..schemas.anidb_mapping import (
    AniDBMappingCreate,
    AniDBMappingUpdate,
    AniDBMappingResponse,
    AniDBMappingList,
    AniDBMappingSearch,
    AniDBMappingStatistics,
    MappingRefreshRequest,
    MappingRefreshResponse,
    ConfidenceScoreRequest,
    ConfidenceScoreResponse
)

router = APIRouter(prefix="/api/anidb-mappings", tags=["AniDB Mappings"])


@router.get("/", response_model=AniDBMappingList)
async def get_mappings(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    source_filter: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all AniDB mappings with optional filtering and pagination.
    """
    service = AniDBMappingService(db)
    mappings = service.get_all_mappings(
        limit=limit, 
        offset=offset, 
        source_filter=source_filter
    )
    
    # Get total count for pagination
    from ..models.anidb_mapping import AniDBMapping
    query = db.query(AniDBMapping)
    if source_filter:
        query = query.filter(AniDBMapping.source == source_filter)
    total = query.count()
    
    return AniDBMappingList(
        mappings=mappings,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/unmapped", response_model=List[AniDBMappingResponse])
async def get_unmapped_entries(
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AniDB entries that don't have MyAnimeList mappings.
    """
    service = AniDBMappingService(db)
    unmapped = service.get_unmapped_entries(limit=limit)
    return unmapped


@router.get("/statistics", response_model=AniDBMappingStatistics)
async def get_mapping_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about the mapping database.
    """
    service = AniDBMappingService(db)
    stats = service.get_mapping_statistics()
    return AniDBMappingStatistics(**stats)


@router.get("/{anidb_id}", response_model=AniDBMappingResponse)
async def get_mapping(
    anidb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific AniDB mapping by AniDB ID.
    """
    service = AniDBMappingService(db)
    mapping = service.get_mapping_by_anidb_id(anidb_id)
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
        
    return mapping


@router.post("/", response_model=AniDBMappingResponse)
async def create_mapping(
    mapping_data: AniDBMappingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new AniDB mapping.
    """
    service = AniDBMappingService(db)
    
    try:
        mapping = service.create_mapping(
            anidb_id=mapping_data.anidb_id,
            mal_id=mapping_data.mal_id,
            title=mapping_data.title,
            confidence_score=mapping_data.confidence_score,
            source=mapping_data.source
        )
        return mapping
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{anidb_id}", response_model=AniDBMappingResponse)
async def update_mapping(
    anidb_id: int,
    mapping_data: AniDBMappingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing AniDB mapping.
    """
    service = AniDBMappingService(db)
    
    mapping = service.update_mapping(
        anidb_id=anidb_id,
        mal_id=mapping_data.mal_id,
        title=mapping_data.title,
        confidence_score=mapping_data.confidence_score,
        source=mapping_data.source
    )
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
        
    return mapping


@router.delete("/{anidb_id}")
async def delete_mapping(
    anidb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an AniDB mapping.
    """
    service = AniDBMappingService(db)
    
    if not service.delete_mapping(anidb_id):
        raise HTTPException(status_code=404, detail="Mapping not found")
        
    return {"message": "Mapping deleted successfully"}


@router.get("/lookup/{anidb_id}/mal-id")
async def lookup_mal_id(
    anidb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lookup MyAnimeList ID for a given AniDB ID.
    """
    service = AniDBMappingService(db)
    mal_id = service.get_mal_id_from_anidb_id(anidb_id)
    
    if mal_id is None:
        raise HTTPException(status_code=404, detail="No mapping found for this AniDB ID")
        
    return {"anidb_id": anidb_id, "mal_id": mal_id}


@router.post("/search", response_model=List[AniDBMappingResponse])
async def search_mappings(
    search_data: AniDBMappingSearch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search for mappings by title or ID.
    """
    service = AniDBMappingService(db)
    results = service.search_mappings(
        query=search_data.query,
        limit=search_data.limit
    )
    return results


@router.post("/refresh", response_model=MappingRefreshResponse)
async def refresh_mapping_data(
    refresh_request: MappingRefreshRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Refresh mapping data from external sources.
    """
    service = AniDBMappingService(db)
    
    try:
        if refresh_request and refresh_request.source_url:
            loaded = service.load_mapping_data_from_github(refresh_request.source_url)
            stats = {'loaded': loaded, 'updated': 0, 'errors': 0}
        else:
            stats = service.refresh_mapping_data()
            
        message = f"Refresh completed: {stats['loaded']} loaded, {stats['updated']} updated"
        if stats['errors'] > 0:
            message += f", {stats['errors']} errors"
            
        return MappingRefreshResponse(
            loaded=stats['loaded'],
            updated=stats['updated'],
            errors=stats['errors'],
            message=message
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


@router.post("/confidence-score", response_model=ConfidenceScoreResponse)
async def calculate_confidence_score(
    score_request: ConfidenceScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate confidence score for a potential mapping.
    """
    service = AniDBMappingService(db)
    
    confidence = service.calculate_confidence_score(
        anidb_title=score_request.anidb_title,
        mal_title=score_request.mal_title,
        additional_factors=score_request.additional_factors
    )
    
    return ConfidenceScoreResponse(
        confidence_score=confidence,
        anidb_title=score_request.anidb_title,
        mal_title=score_request.mal_title
    )