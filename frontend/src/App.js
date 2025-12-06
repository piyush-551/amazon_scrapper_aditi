import React, { useState } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import ProductForm from './components/ProductForm';
import SideBySideView from './components/SideBySideView';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import axios from 'axios';

function App() {
  const [asin, setAsin] = useState('');
  const [originalData, setOriginalData] = useState(null);
  const [optimizedData, setOptimizedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  const handleSearch = async (searchAsin) => {
    if (!searchAsin.trim()) {
      setError('Please enter a valid ASIN');
      return;
    }

    setLoading(true);
    setError(null);
    setOriginalData(null);
    setOptimizedData(null);

    try {
      const response = await axios.get(`/api/product/${searchAsin.trim()}`);
      setOriginalData(response.data.original);
      setOptimizedData(response.data.optimized);
      setAsin(searchAsin.trim());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch product. Please check the ASIN and try again.');
      setOriginalData(null);
      setOptimizedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async (formData) => {
    setOptimizing(true);
    setError(null);

    try {
      const response = await axios.post('/api/optimize', {
        asin: asin,
        title: formData.title,
        bullets: formData.bullets,
        description: formData.description,
      });

      setOptimizedData(response.data.optimized);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to optimize product. Please try again.');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Amazon Product Listing Optimizer</h1>
        <p>Optimize your Amazon product listings with AI</p>
      </header>

      <SearchBar onSearch={handleSearch} loading={loading} />

      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      {loading && <Loader />}

      {originalData && !optimizedData && !loading && (
        <ProductForm
          originalData={originalData}
          onOptimize={handleOptimize}
          optimizing={optimizing}
        />
      )}

      {originalData && optimizedData && (
        <SideBySideView
          original={originalData}
          optimized={optimizedData}
        />
      )}
    </div>
  );
}

export default App;

