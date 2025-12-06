import React, { useState } from 'react';
import './SearchBar.css';

function SearchBar({ onSearch, loading }) {
  const [asin, setAsin] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (asin.trim() && !loading) {
      onSearch(asin);
    }
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <label htmlFor="asin-input" className="search-label">
            Enter Amazon ASIN:
          </label>
          <div className="input-group">
            <input
              id="asin-input"
              type="text"
              value={asin}
              onChange={(e) => setAsin(e.target.value.toUpperCase())}
              placeholder="e.g., B08N5WRWNW"
              className="search-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="search-button"
              disabled={loading || !asin.trim()}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <p className="search-hint">
            Enter a 10-character Amazon ASIN to fetch product details
          </p>
        </div>
      </form>
    </div>
  );
}

export default SearchBar;

