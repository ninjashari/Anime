import React from 'react';
import AnimeListPage from '../components/anime/AnimeListPage';

const PlanToWatchList: React.FC = () => {
  return (
    <AnimeListPage 
      status="plan_to_watch" 
      title="Plan to Watch" 
    />
  );
};

export default PlanToWatchList;