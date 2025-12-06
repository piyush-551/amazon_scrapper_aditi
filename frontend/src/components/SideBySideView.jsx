import React from 'react';
import './SideBySideView.css';

function SideBySideView({ original, optimized }) {
  return (
    <div className="side-by-side-container">
      <div className="comparison-header">
        <h2>Original vs Optimized</h2>
        <p>Compare the original listing with the AI-optimized version</p>
      </div>

      <div className="comparison-grid">
        {/* Title Comparison */}
        <div className="comparison-section">
          <h3 className="section-title">Title</h3>
          <div className="comparison-cards">
            <div className="comparison-card original-card">
              <h4 className="card-label">Original</h4>
              <p className="card-content">{original.title}</p>
            </div>
            <div className="comparison-card optimized-card">
              <h4 className="card-label">Optimized</h4>
              <p className="card-content">{optimized.opt_title}</p>
            </div>
          </div>
        </div>

        {/* Bullet Points Comparison */}
        <div className="comparison-section">
          <h3 className="section-title">Bullet Points</h3>
          <div className="comparison-cards">
            <div className="comparison-card original-card">
              <h4 className="card-label">Original</h4>
              <ul className="bullet-list">
                {Array.isArray(original.bullets) ? (
                  original.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))
                ) : (
                  <li>{original.bullets}</li>
                )}
              </ul>
            </div>
            <div className="comparison-card optimized-card">
              <h4 className="card-label">Optimized</h4>
              <ul className="bullet-list">
                {Array.isArray(optimized.opt_bullets) ? (
                  optimized.opt_bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))
                ) : (
                  <li>{optimized.opt_bullets}</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Description Comparison */}
        <div className="comparison-section">
          <h3 className="section-title">Description</h3>
          <div className="comparison-cards">
            <div className="comparison-card original-card">
              <h4 className="card-label">Original</h4>
              <p className="card-content description-text">
                {original.description}
              </p>
            </div>
            <div className="comparison-card optimized-card">
              <h4 className="card-label">Optimized</h4>
              <p className="card-content description-text">
                {optimized.opt_description}
              </p>
            </div>
          </div>
        </div>

        {/* Keywords */}
        {optimized.keywords && (
          <div className="comparison-section">
            <h3 className="section-title">Suggested Keywords</h3>
            <div className="keywords-card">
              <div className="keywords-content">
                {optimized.keywords.split(',').map((keyword, index) => (
                  <span key={index} className="keyword-tag">
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SideBySideView;

