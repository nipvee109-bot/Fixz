import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id, isActive: true },
    include: {
      category: true,
      stocks: { where: { isSold: false } },
    },
  });

  if (!product) {
    notFound();
  }

  const serializedProduct = {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    thumbnail: product.thumbnail,
    type: product.type,
    categoryName: product.category?.name || 'ทั่วไป',
    stockCount: product.stocks.length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <ProductDetailClient product={serializedProduct} />
    </div>
  );
}
