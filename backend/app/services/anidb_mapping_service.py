"""
AniDB mapping service for managing AniDB to MyAnimeList ID mappings.
"""
import logging
import requests
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.anidb_mapping import AniDBMapping
from ..models.anime import Anime
from ..core.database import get_db

logger = logging.getLogger(__name__)


class AniDBMappingService:
    """
    Service for managing AniDB to MyAnimeList ID mappings.
    Handles loading mapping data, lookup functionality, confidence scoring,
    and manual overrides.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
    def get_mapping_by_anidb_id(self, anidb_id: int) -> Optional[AniDBMapping]:
        """
        Get mapping by AniDB ID.
        
        Args:
            anidb_id: The AniDB ID to look up
            
        Returns:
            AniDBMapping object if found, None otherwise
        """
        return self.db.query(AniDBMapping).filter(
            AniDBMapping.anidb_id == anidb_id
        ).first()
        
    def get_mal_id_from_anidb_id(self, anidb_id: int) -> Optional[int]:
        """
        Get MyAnimeList ID from AniDB ID.
        
        Args:
            anidb_id: The AniDB ID to look up
            
        Returns:
            MyAnimeList ID if mapping exists, None otherwise
        """
        mapping = self.get_mapping_by_anidb_id(anidb_id)
        return mapping.mal_id if mapping else None
        
    def create_mapping(
        self, 
        anidb_id: int, 
        mal_id: Optional[int] = None,
        title: Optional[str] = None,
        confidence_score: Optional[float] = None,
        source: str = 'manual'
    ) -> AniDBMapping:
        """
        Create a new AniDB to MyAnimeList mapping.
        
        Args:
            anidb_id: The AniDB ID
            mal_id: The MyAnimeList ID (optional)
            title: The anime title (optional)
            confidence_score: Confidence in mapping accuracy (0.0-1.0)
            source: Source of the mapping ('manual', 'auto', 'github_file')
            
        Returns:
            Created AniDBMapping object
        """
        # Check if mapping already exists
        existing = self.get_mapping_by_anidb_id(anidb_id)
        if existing:
            raise ValueError(f"Mapping for AniDB ID {anidb_id} already exists")
            
        mapping = AniDBMapping(
            anidb_id=anidb_id,
            mal_id=mal_id,
            title=title,
            confidence_score=confidence_score,
            source=source
        )
        
        self.db.add(mapping)
        self.db.commit()
        self.db.refresh(mapping)
        
        logger.info(f"Created mapping: AniDB {anidb_id} -> MAL {mal_id} (source: {source})")
        return mapping
        
    def update_mapping(
        self,
        anidb_id: int,
        mal_id: Optional[int] = None,
        title: Optional[str] = None,
        confidence_score: Optional[float] = None,
        source: Optional[str] = None
    ) -> Optional[AniDBMapping]:
        """
        Update an existing AniDB mapping.
        
        Args:
            anidb_id: The AniDB ID to update
            mal_id: New MyAnimeList ID (optional)
            title: New anime title (optional)
            confidence_score: New confidence score (optional)
            source: New source (optional)
            
        Returns:
            Updated AniDBMapping object if found, None otherwise
        """
        mapping = self.get_mapping_by_anidb_id(anidb_id)
        if not mapping:
            return None
            
        if mal_id is not None:
            mapping.mal_id = mal_id
        if title is not None:
            mapping.title = title
        if confidence_score is not None:
            mapping.confidence_score = confidence_score
        if source is not None:
            mapping.source = source
            
        self.db.commit()
        self.db.refresh(mapping)
        
        logger.info(f"Updated mapping: AniDB {anidb_id} -> MAL {mapping.mal_id}")
        return mapping        

    def delete_mapping(self, anidb_id: int) -> bool:
        """
        Delete an AniDB mapping.
        
        Args:
            anidb_id: The AniDB ID to delete
            
        Returns:
            True if mapping was deleted, False if not found
        """
        mapping = self.get_mapping_by_anidb_id(anidb_id)
        if not mapping:
            return False
            
        self.db.delete(mapping)
        self.db.commit()
        
        logger.info(f"Deleted mapping for AniDB ID {anidb_id}")
        return True
        
    def get_all_mappings(
        self, 
        limit: int = 100, 
        offset: int = 0,
        source_filter: Optional[str] = None
    ) -> List[AniDBMapping]:
        """
        Get all AniDB mappings with optional filtering.
        
        Args:
            limit: Maximum number of mappings to return
            offset: Number of mappings to skip
            source_filter: Filter by source type (optional)
            
        Returns:
            List of AniDBMapping objects
        """
        query = self.db.query(AniDBMapping)
        
        if source_filter:
            query = query.filter(AniDBMapping.source == source_filter)
            
        return query.offset(offset).limit(limit).all()
        
    def get_unmapped_entries(self, limit: int = 100) -> List[AniDBMapping]:
        """
        Get AniDB entries that don't have a MyAnimeList mapping.
        
        Args:
            limit: Maximum number of entries to return
            
        Returns:
            List of AniDBMapping objects without MAL IDs
        """
        return self.db.query(AniDBMapping).filter(
            AniDBMapping.mal_id.is_(None)
        ).limit(limit).all()
        
    def calculate_confidence_score(
        self, 
        anidb_title: str, 
        mal_title: str,
        additional_factors: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Calculate confidence score for a mapping based on title similarity and other factors.
        
        Args:
            anidb_title: Title from AniDB
            mal_title: Title from MyAnimeList
            additional_factors: Additional factors for scoring (optional)
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        if not anidb_title or not mal_title:
            return 0.0
            
        # Simple string similarity calculation
        # In a real implementation, you might use more sophisticated algorithms
        # like Levenshtein distance, fuzzy matching, etc.
        
        anidb_lower = anidb_title.lower().strip()
        mal_lower = mal_title.lower().strip()
        
        # Exact match
        if anidb_lower == mal_lower:
            return 1.0
            
        # Check if one title contains the other
        if anidb_lower in mal_lower or mal_lower in anidb_lower:
            return 0.8
            
        # Calculate basic similarity based on common words
        anidb_words = set(anidb_lower.split())
        mal_words = set(mal_lower.split())
        
        if not anidb_words or not mal_words:
            return 0.0
            
        common_words = anidb_words.intersection(mal_words)
        total_words = anidb_words.union(mal_words)
        
        similarity = len(common_words) / len(total_words) if total_words else 0.0
        
        # Apply additional factors if provided
        if additional_factors:
            # Example: boost confidence if episode counts match
            if additional_factors.get('episode_count_match'):
                similarity = min(1.0, similarity + 0.1)
            # Example: reduce confidence if years are very different
            if additional_factors.get('year_difference', 0) > 5:
                similarity = max(0.0, similarity - 0.2)
                
        return round(similarity, 2)
    
    def load_mapping_data_from_github(self, url: str = None) -> int:
        """
        Load AniDB to MyAnimeList mapping data from external source (e.g., GitHub).
        
        Args:
            url: URL to fetch mapping data from. If None, uses default source.
            
        Returns:
            Number of mappings loaded
        """
        # Default URL for AniDB-MAL mapping data (example)
        if not url:
            url = "https://raw.githubusercontent.com/Anime-Lists/anime-lists/master/anime-list-full.json"
            
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Assuming the data is in JSON format with structure like:
            # [{"anidb_id": 123, "mal_id": 456, "title": "Anime Title"}, ...]
            mapping_data = response.json()
            
            loaded_count = 0
            for item in mapping_data:
                anidb_id = item.get('anidb_id')
                mal_id = item.get('mal_id')
                title = item.get('title')
                
                if not anidb_id:
                    continue
                    
                # Check if mapping already exists
                existing = self.get_mapping_by_anidb_id(anidb_id)
                if existing:
                    # Update if this is from a more reliable source
                    if existing.source == 'manual':
                        continue  # Don't override manual mappings
                    self.update_mapping(
                        anidb_id=anidb_id,
                        mal_id=mal_id,
                        title=title,
                        source='github_file'
                    )
                else:
                    # Create new mapping
                    self.create_mapping(
                        anidb_id=anidb_id,
                        mal_id=mal_id,
                        title=title,
                        source='github_file'
                    )
                    
                loaded_count += 1
                
            logger.info(f"Loaded {loaded_count} mappings from {url}")
            return loaded_count
            
        except requests.RequestException as e:
            logger.error(f"Failed to load mapping data from {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error processing mapping data: {e}")
            raise
            
    def refresh_mapping_data(self) -> Dict[str, int]:
        """
        Refresh mapping data from external sources and update confidence scores.
        
        Returns:
            Dictionary with statistics about the refresh operation
        """
        stats = {
            'loaded': 0,
            'updated': 0,
            'errors': 0
        }
        
        try:
            # Load from GitHub source
            loaded = self.load_mapping_data_from_github()
            stats['loaded'] = loaded
            
            # Update confidence scores for existing mappings
            mappings = self.get_all_mappings(limit=1000)  # Process in batches
            for mapping in mappings:
                if mapping.mal_id and mapping.title:
                    # Get anime info to calculate confidence
                    anime = self.db.query(Anime).filter(
                        Anime.mal_id == mapping.mal_id
                    ).first()
                    
                    if anime:
                        confidence = self.calculate_confidence_score(
                            mapping.title,
                            anime.title
                        )
                        if confidence != mapping.confidence_score:
                            mapping.confidence_score = confidence
                            stats['updated'] += 1
                            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error during mapping data refresh: {e}")
            stats['errors'] += 1
            
        return stats        

    def search_mappings(
        self, 
        query: str, 
        limit: int = 50
    ) -> List[AniDBMapping]:
        """
        Search for mappings by title or ID.
        
        Args:
            query: Search query (can be title or ID)
            limit: Maximum number of results
            
        Returns:
            List of matching AniDBMapping objects
        """
        # Try to parse as integer for ID search
        try:
            id_query = int(query)
            # Search by AniDB ID or MAL ID
            id_results = self.db.query(AniDBMapping).filter(
                or_(
                    AniDBMapping.anidb_id == id_query,
                    AniDBMapping.mal_id == id_query
                )
            ).limit(limit).all()
            
            if id_results:
                return id_results
        except ValueError:
            pass
            
        # Search by title
        title_results = self.db.query(AniDBMapping).filter(
            AniDBMapping.title.ilike(f"%{query}%")
        ).limit(limit).all()
        
        return title_results
        
    def get_mapping_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the mapping database.
        
        Returns:
            Dictionary with mapping statistics
        """
        total_mappings = self.db.query(AniDBMapping).count()
        mapped_count = self.db.query(AniDBMapping).filter(
            AniDBMapping.mal_id.isnot(None)
        ).count()
        unmapped_count = total_mappings - mapped_count
        
        # Count by source
        manual_count = self.db.query(AniDBMapping).filter(
            AniDBMapping.source == 'manual'
        ).count()
        auto_count = self.db.query(AniDBMapping).filter(
            AniDBMapping.source == 'auto'
        ).count()
        github_count = self.db.query(AniDBMapping).filter(
            AniDBMapping.source == 'github_file'
        ).count()
        
        # Average confidence score
        avg_confidence = self.db.query(AniDBMapping.confidence_score).filter(
            AniDBMapping.confidence_score.isnot(None)
        ).all()
        
        avg_confidence_score = None
        if avg_confidence:
            scores = [float(score[0]) for score in avg_confidence if score[0] is not None]
            avg_confidence_score = sum(scores) / len(scores) if scores else None
            
        return {
            'total_mappings': total_mappings,
            'mapped_count': mapped_count,
            'unmapped_count': unmapped_count,
            'manual_count': manual_count,
            'auto_count': auto_count,
            'github_count': github_count,
            'average_confidence': round(avg_confidence_score, 2) if avg_confidence_score else None
        }