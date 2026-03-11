import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { menuAPI } from '../../lib/api';
import MenuCard from '../../components/MenuCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const Menu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const activeCategory = searchParams.get('category') || '';
  const vegFilter = searchParams.get('veg') || '';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [menuResponse, categoryResponse] = await Promise.all([
          menuAPI.getItems({
            category: activeCategory || undefined,
            veg: vegFilter || undefined,
            search: searchQuery || undefined,
          }),
          menuAPI.getCategories(),
        ]);
        setItems(menuResponse.data.data);
        setCategories(categoryResponse.data.data);
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeCategory, vegFilter, searchQuery]);

  const handleCategoryChange = (categorySlug) => {
    const params = new URLSearchParams(searchParams);
    if (categorySlug) {
      params.set('category', categorySlug);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const handleVegFilter = (value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('veg', value);
    } else {
      params.delete('veg');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery('');
  };

  const hasFilters = activeCategory || vegFilter || searchQuery;

  return (
    <div className="min-h-screen bg-accent py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-secondary">Our Menu</h1>
          <p className="text-gray-500 mt-1">
            Explore our delicious Biryani & Chinese dishes
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 sticky top-16 z-30">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* Filter Button (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              {hasFilters && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-3">
              {/* Veg Filter */}
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => handleVegFilter('')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    !vegFilter ? 'bg-secondary text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleVegFilter('true')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    vegFilter === 'true' ? 'bg-green-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="w-3 h-3 border-2 border-green-600 rounded-sm flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  </span>
                  Veg
                </button>
                <button
                  onClick={() => handleVegFilter('false')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    vegFilter === 'false' ? 'bg-red-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="w-3 h-3 border-2 border-red-600 rounded-sm flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                  </span>
                  Non-Veg
                </button>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-gray-500 hover:text-primary"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-4 animate-fade-in">
              {/* Veg Filter */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Diet</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVegFilter('')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !vegFilter ? 'bg-secondary text-white' : 'bg-gray-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleVegFilter('true')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      vegFilter === 'true' ? 'bg-green-600 text-white' : 'bg-gray-100'
                    }`}
                  >
                    Veg Only
                  </button>
                  <button
                    onClick={() => handleVegFilter('false')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      vegFilter === 'false' ? 'bg-red-600 text-white' : 'bg-gray-100'
                    }`}
                  >
                    Non-Veg
                  </button>
                </div>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2 text-primary font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="mb-6 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                !activeCategory
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary hover:bg-gray-100'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.slug
                    ? 'bg-primary text-white'
                    : 'bg-white text-secondary hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-primary font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
