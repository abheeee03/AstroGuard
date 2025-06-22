'use client'
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { log } from "console";
import { Check, CheckLine, TicketCheck, ToggleRight, Calendar, Clock } from "lucide-react";
import Image from "next/image";

interface Scan {
  id: number;
  public_url: string;
  created_at: string;
  detection_count: number;
  detections: Array<{
    class_name: string;
  }>;
}

export default function Home(){
  const router = useRouter();
  const [fireExtinguishers, setFireExtinguishers] = useState(0);
  const [toolboxes, setToolboxes] = useState(0);
  const [oxygenTanks, setOxygenTanks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(true);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        
        // Fetch items from the database
        const { data, error } = await supabase
          .from('items')
          .select('*');
        
        if (error) throw error;
        
        // Count items by type based on the image data
        if (data) {
          console.log(data);
          
          const tools = data[0].quantity;
          const oxygen = data[1].quantity;
          const extinguishers = data[2].quantity;
          
          setFireExtinguishers(extinguishers);
          setToolboxes(tools);
          setOxygenTanks(oxygen);
        }

        // Fetch recent scans
        const { data: scanData, error: scanError } = await supabase
          .from('uploaded_images')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (scanError) throw scanError;
        
        if (scanData) {
          setRecentScans(scanData as Scan[]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchItems();
  }, []);

  return<>
      <NavBar/>
    <div className="min-h-screen w-full py-20 px-20">
      <div className="flex items-start justify-end gap-2">
        <Button onClick={()=>router.push('/items')} className="cursor-pointer">Manage Inventory </Button>
        <Button onClick={()=>router.push('/detect/realtime')} className="cursor-pointer">Detect From Camera</Button>
        <Button onClick={()=>router.push('/detect/image')} className="cursor-pointer">Detect From Image</Button>
      </div>
      <div className="flex flex-wrap items-start mt-10 justify-start gap-15">
      <Card className="w-50 h-40 text-center shadow-primary/5 hover:scale-105 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">Available Fire Extinguishers</CardTitle>
          <CardContent className="text-5xl font-bold">
            {loading ? "..." : fireExtinguishers}
          </CardContent>
        </CardHeader>
      </Card>
      <Card className="w-50 h-40 text-center shadow-primary/5 hover:scale-105 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">Available <br /> Toolbox</CardTitle>
          <CardContent className="text-5xl font-bold">
            {loading ? "..." : toolboxes}
          </CardContent>
        </CardHeader>
      </Card>
      <Card className="w-50 h-40 text-center shadow-primary/5 hover:scale-105 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">Available Oxygen Tanks</CardTitle>
          <CardContent className="text-5xl font-bold">
            {loading ? "..." : oxygenTanks}
          </CardContent>
        </CardHeader>
      </Card>
      <Card className="w-50 h-40 text-center shadow-primary/5 hover:scale-105 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">System Status</CardTitle>
          <CardContent className="text-2xl text-green-500 font-bold mt-5">
            {systemStatus ? "Active" : "Inactive"}
          </CardContent>
        </CardHeader>
      </Card>

      </div>
      <div className="w-full mt-16">
        <h1 className="text-2xl font-bold mb-6">Recently Scanned Images</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg">Loading recent scans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentScans.map((scan, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="relative h-48 w-full">
                  <Image 
                    src={scan.public_url || '/placeholder-scan.jpg'} 
                    alt={`Scan ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="transition-transform duration-300 hover:scale-105"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  </>
}