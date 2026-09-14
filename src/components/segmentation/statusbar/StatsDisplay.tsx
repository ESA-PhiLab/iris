import React from 'react';

const StatsDisplay: React.FC = () => {
  return (
    <>
      <div className="complete-statusbutton">
        <div id="different-classes" className="info-box-top">0</div>
        <div className="info-box-bottom">Classes</div>
      </div>
      <div className="complete-statusbutton">
        <div id="drawn-pixels" className="info-box-top">0</div>
        <div className="info-box-bottom">Drawn pixels</div>
      </div>
    </>
  );
};

export default StatsDisplay;
