import React from 'react';
import AnimeListPage from '../components/anime/AnimeListPage';

const DroppedList: React.FC = () => {
  return (
    <AnimeListPage 
      status="dropped" 
      title="Dropped Anime" 
    />
  );
};

export default DroppedList;