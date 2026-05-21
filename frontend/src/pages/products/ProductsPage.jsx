import { useEffect, useState } from 'react';
import { fetchCategories, fetchProducts } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import ProductCard from '../../components/products/ProductCard';
import './ProductsPage.css';

export default function ProductsPage() {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProducts({
      categoryId: categoryId || undefined,
      search,
      sort: sort === 'newest' ? undefined : sort,
    })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [categoryId, search, sort]);

  const handleAddToCart = (product) => {
    addItem(product, 1);
    showToast(`已將「${product.name}」加入購物車`);
  };

  return (
    <div className="products-page">
      <header className="page-header">
        <h1>商品列表</h1>
        <p>瀏覽商品並加入購物車</p>
      </header>

      <div className="products-toolbar">
        <input
          type="search"
          className="products-toolbar__search"
          placeholder="搜尋商品名稱…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="products-toolbar__select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">全部分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="products-toolbar__select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">最新上架</option>
          <option value="price_asc">價格由低到高</option>
          <option value="price_desc">價格由高到低</option>
        </select>
      </div>

      {loading ? (
        <p className="page-loading">載入商品中…</p>
      ) : products.length === 0 ? (
        <p className="products-empty">找不到符合條件的商品</p>
      ) : (
        <div className="products-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}
    </div>
  );
}
