import React from 'react';
import AnimeListPage from '../components/anime/AnimeListPage';

const OnHoldList: React.FC = () => {
  return (
    <AnimeListPage 
      status="on_hold" 
      title="On Hold" 
    />
  );
};

export default OnHoldList;