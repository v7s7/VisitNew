import { useState, useEffect } from 'react';
import { Property } from '../types';
import { searchProperties } from '../api';
import { debounce } from '../utils';
import AddPropertyModal from './AddPropertyModal';
import './PropertySearch.css';

interface PropertySearchProps {
  onPropertySelect: (property: Property) => void;
  selectedProperty: Property | null;
}

export default function PropertySearch({ onPropertySelect, selectedProperty }: PropertySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Debounced search function
  useEffect(() => {
    const debouncedSearch = debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const results = await searchProperties(query);
        setSearchResults(results);
        setShowResults(true);
      } catch (err) {
        setError('فشل البحث. حاول مرة أخرى.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    debouncedSearch(searchQuery);
  }, [searchQuery]);

  const handlePropertyClick = (property: Property) => {
    onPropertySelect(property);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    onPropertySelect(null as any);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handlePropertyAdded = (property: Property) => {
    onPropertySelect(property);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  return (
    <div className="property-search">
      <h3 className="section-title">اختيار العقار | Property Selection</h3>

      {selectedProperty ? (
        <div className="selected-property">
          <div className="selected-property-info">
            <div className="property-name">{selectedProperty.name}</div>
            <div className="property-details">
              <span className="property-code">مبنى: {selectedProperty.code}</span>
              <span className="property-location">
                {selectedProperty.area} - {selectedProperty.governorate}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="clear-button secondary small"
          >
            تغيير
          </button>
        </div>
      ) : (
        <>
          <div className="search-input-wrapper">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو المبنى (مثال: 843) | Search by name or building"              className="search-input"
              autoComplete="off"
            />
            {isSearching && <span className="search-loading loading"></span>}
          </div>

          {error && <div className="error-message">{error}</div>}

          {showResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handlePropertyClick(property)}
                  className="property-item"
                >
                  <div className="property-item-name">{property.name}</div>
                  <div className="property-item-code">مبنى : {property.code}</div>
                  <div className="property-item-location">
                    {property.area} - {property.block}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && !isSearching && (
            <div className="no-results">لا توجد نتائج | No results found</div>
          )}

          <button
            type="button"
            className="add-property-btn"
            onClick={() => setShowAddModal(true)}
          >
            + إضافة عقار جديد | Add New Property
          </button>
        </>
      )}

      <AddPropertyModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onPropertyAdded={handlePropertyAdded}
      />
    </div>
  );
}
