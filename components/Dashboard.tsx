'use client';

import { useState } from 'react';
import { ShoppingCart, LogOut, Plus, Minus } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { BrandLogo } from './BrandLogo';
import { DevelopmentNotice } from './DevelopmentNotice';

interface DashboardProps {
  onDispense: (quantity: number) => void;
  onLogout: () => void | Promise<void>;
  userEmail: string;
}

export function Dashboard({ onDispense, onLogout, userEmail }: DashboardProps) {
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);

  const handleIncrement = () => {
    if (quantity < 20) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    setCartCount(cartCount + quantity);
  };

  const handleDispense = () => {
    if (cartCount === 0) {
      alert('Please add items to cart first');
      return;
    }
    onDispense(cartCount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <BrandLogo size={68} />
            <p className="text-sm text-gray-600">Signed in as {userEmail}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Select Your Chips</CardTitle>
            <CardDescription>Choose quantity and add to cart</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chips Image */}
            <div className="flex justify-center">
              <ImageWithFallback
                src="/chips.png"
                alt="Potato Chips"
                width={256}
                height={256}
                className="w-64 h-64 object-cover rounded-lg shadow-md"
              />
            </div>

            {/* Product Info */}
            <div className="text-center space-y-2">
              <h3>Classic Potato Chips</h3>
              <p className="text-sm text-gray-600">₹10 per packet</p>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="text-sm">Select Quantity</label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-20 text-center">
                  <span className="text-2xl">{quantity}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleIncrement}
                  disabled={quantity >= 20}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Cart Info */}
            {cartCount > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <ShoppingCart className="h-5 w-5" />
                  <span>{cartCount} items in cart (₹{cartCount * 10})</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button onClick={handleAddToCart} variant="outline" className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
              <Button onClick={handleDispense} className="w-full">
                Dispense ({cartCount} items)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <DevelopmentNotice />
    </div>
  );
}
