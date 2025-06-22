"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner"
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase';


type Item = {
  id: string;
  name: string;
  quantity: number;
};

function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('Oxygen Tank');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch initial data
    fetchItems();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('items-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'items' }, 
        (payload) => {
          fetchItems();
        }
      )
      .subscribe();
    
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*');
      
      if (error) {
        toast.error('Error fetching items: ' + error.message);
      } else {
        setItems(data);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddItem = async () => {
    try {
      // Find the item to update
      const itemToUpdate = items.find(item => item.name === selectedItem);
      
      if (itemToUpdate) {
        const newQuantity = itemToUpdate.quantity + quantity;
        
        const { error } = await supabase
          .from('items')
          .update({ quantity: newQuantity })
          .eq('id', itemToUpdate.id);
        
        if (error) {
          toast.error('Error updating item: ' + error.message);
        } else {
          // Update local state immediately
          setItems(items.map(item => 
            item.id === itemToUpdate.id 
              ? { ...item, quantity: newQuantity } 
              : item
          ));
          toast.success(`Added ${quantity} ${selectedItem}(s) to inventory.`);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };
  
  const handleRemoveItem = async (itemId: string, itemName: string) => {
    try {
      // Find the item to update
      const itemToUpdate = items.find(item => item.id === itemId);
      
      if (itemToUpdate && itemToUpdate.quantity > 0) {
        const newQuantity = itemToUpdate.quantity - 1;
        
        const { error } = await supabase
          .from('items')
          .update({ quantity: newQuantity })
          .eq('id', itemId);
        
        if (error) {
          toast.error('Error updating item: ' + error.message);
        } else {
          // Update local state immediately
          setItems(items.map(item => 
            item.id === itemId 
              ? { ...item, quantity: newQuantity } 
              : item
          ));
          toast.error(`Removed 1 ${itemName} from inventory.`);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };
  
  return (
    <>
    <NavBar/>
    <div className="container mx-auto py-25 px-20">
      <h1 className="text-3xl text-center font-bold mb-6">Inventory Management</h1>
      
      <div className="flex items-center justify-center gap-4 mb-8">
        <Select
          value={selectedItem}
          onValueChange={setSelectedItem}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-24"
        />
        
        <Button onClick={handleAddItem} disabled={loading}>Add Item</Button>
      </div>
      <div className="px-40">

      <div className="mt-10 px-10 border rounded-lg py-10">

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">Loading...</TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">No items found</TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleRemoveItem(item.id, item.name)}
                    disabled={item.quantity <= 0}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
      </div>
    </>
  );
}

export default ItemsPage;