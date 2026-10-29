// How many of each product color are on the shelf, and when the next shipment
// lands (Product Bible Section 10). Stock changes, so check_availability reads
// it fresh every time instead of remembering it.
// Stock lives in the Supabase `inventory` table, so a warehouse update is a
// row edit, not a code change. This is the only file that knows where stock is
// kept, so swapping Supabase for something else later means changing only
// readInventory().
import { createStatelessClient } from "@/lib/supabase/server";

/** One row of stock, named like the database columns it comes from. */
export type InventoryRow = {
  sku: string;
  product: string;
  color: string;
  units_in_stock: number;
  next_shipment: string;
};

/** Every stock row, or `null` when stock can't be read right now. */
export async function readInventory(): Promise<InventoryRow[] | null> {
  // No Supabase settings: say "can't read", never guess at stock.
  const supabase = createStatelessClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select("sku, product, color, units_in_stock, next_shipment");
    if (error || !data) return null;
    return data as InventoryRow[];
  } catch {
    return null;
  }
}
