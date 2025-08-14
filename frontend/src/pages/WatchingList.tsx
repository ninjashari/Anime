import React from 'react';
import AnimeListPage from '../components/anime/AnimeListPage';

const WatchingList: React.FC = () => {
  return (
    <AnimeListPage 
      status="watching" 
      title="Currently Watching" 
    />
  );
};

export default WatchingList;