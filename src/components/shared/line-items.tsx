import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LineItem, Product } from "@/types";
import { formatMoney, roundMoney } from "@/lib/utils";

export function LineItemsEditor({
  items,
  products,
  currency,
  onChange,
}: {
  items: LineItem[];
  products: Product[];
  currency: string;
  onChange: (items: LineItem[]) => void;
}) {
  const update = (index: number, patch: Partial<LineItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-12 gap-2 text-xs text-muted-foreground sm:grid">
        <div className="col-span-5">Item</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-3">Unit price</div>
        <div className="col-span-2 text-right">Line</div>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
          <div className="sm:col-span-5">
            <Select
              value={item.productId || "__custom"}
              onValueChange={(value) => {
                if (value === "__custom") {
                  update(index, { productId: undefined });
                  return;
                }
                const product = products.find((p) => p.id === value);
                if (!product) return;
                update(index, { productId: product.id, name: product.name, unitPrice: product.sellingPrice });
              }}
            >
              <SelectTrigger aria-label="Product">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom">Custom item</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!item.productId ? (
              <Input
                className="mt-1"
                value={item.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Item name"
                aria-label="Item name"
              />
            ) : null}
          </div>
          <Input
            className="sm:col-span-2"
            type="number"
            min={0}
            step="1"
            value={item.quantity}
            onChange={(e) => update(index, { quantity: Number(e.target.value) })}
            aria-label="Quantity"
          />
          <Input
            className="sm:col-span-3"
            type="number"
            min={0}
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => update(index, { unitPrice: Number(e.target.value) })}
            aria-label="Unit price"
          />
          <div className="flex items-center justify-between sm:col-span-2 sm:justify-end">
            <span className="text-sm">{formatMoney(roundMoney(item.quantity * item.unitPrice), currency)}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove item">
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { name: "", quantity: 1, unitPrice: 0 }])}
      >
        <Plus /> Add item
      </Button>
    </div>
  );
}
