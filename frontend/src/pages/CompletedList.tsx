import React from 'react';
import AnimeListPage from '../components/anime/AnimeListPage';

const CompletedList: React.FC = () => {
  return (
    <AnimeListPage 
      status="completed" 
      title="Completed Anime" 
    />
  );
};

export default CompletedList;