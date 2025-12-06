import React, { useState, useEffect } from 'react';
import './ProductForm.css';

function ProductForm({ originalData, onOptimize, optimizing }) {
  const [formData, setFormData] = useState({
    title: '',
    bullets: [],
    description: '',
  });

  useEffect(() => {
    if (originalData) {
      setFormData({
        title: originalData.title || '',
        bullets: Array.isArray(originalData.bullets)
          ? originalData.bullets
          : [originalData.bullets || ''],
        description: originalData.description || '',
      });
    }
  }, [originalData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBulletChange = (index, value) => {
    const newBullets = [...formData.bullets];
    newBullets[index] = value;
    setFormData((prev) => ({
      ...prev,
      bullets: newBullets,
    }));
  };

  const addBullet = () => {
    setFormData((prev) => ({
      ...prev,
      bullets: [...prev.bullets, ''],
    }));
  };

  const removeBullet = (index) => {
    setFormData((prev) => ({
      ...prev,
      bullets: prev.bullets.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onOptimize(formData);
  };

  if (!originalData) return null;

  return (
    <div className="product-form-container">
      <div className="form-card">
        <h2 className="form-title">Edit Product Details</h2>
        <p className="form-subtitle">
          Review and edit the fetched product information, then click "Optimize Now" to generate AI-optimized content.
        </p>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title
            </label>
            <textarea
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="form-textarea"
              rows="2"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bullet Points</label>
            {formData.bullets.map((bullet, index) => (
              <div key={index} className="bullet-input-group">
                <textarea
                  value={bullet}
                  onChange={(e) => handleBulletChange(index, e.target.value)}
                  className="form-textarea bullet-textarea"
                  rows="2"
                  placeholder={`Bullet point ${index + 1}`}
                />
                {formData.bullets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBullet(index)}
                    className="remove-bullet-button"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addBullet}
              className="add-bullet-button"
            >
              + Add Bullet Point
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="form-textarea"
              rows="6"
              required
            />
          </div>

          <button
            type="submit"
            className="optimize-button"
            disabled={optimizing || !formData.title.trim() || !formData.description.trim()}
          >
            {optimizing ? 'Optimizing...' : 'Optimize Now'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;

