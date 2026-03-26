import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function rotatePoint(lat: number, lng: number, angleDeg: number, originLat: number, originLng: number) {
  const rad = angleDeg * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const dLng = lng - originLng;
  const dLat = lat - originLat;
  
  const newLng = dLng * cos - dLat * sin + originLng;
  const newLat = dLng * sin + dLat * cos + originLat;
  
  return { lat: newLat, lng: newLng };
}

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), '../data/processed/s1_alt_predictions_20260325235108.json');
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Process and filter strictly for deforested regions with >50% confidence to save bandwidth
    const filteredPoints = data.filter((d: any) => d.deforestation === 1 && d.confidence > 0.5);
    
    // Center of the Area of Interest bounding box
    const originLat = -11.49533; 
    const originLng = 27.770735;

    // Apply 60-degree anti-clockwise rotation
    const translatedPoints = filteredPoints.map((p: any) => {
      const rotated = rotatePoint(p.lat, p.lng, 60, originLat, originLng);
      return { 
        ...p, 
        lat: rotated.lat, 
        lng: rotated.lng, 
        original_lat: p.lat, 
        original_lng: p.lng 
      };
    });
    
    return NextResponse.json(translatedPoints);
  } catch (error) {
    console.error('Error reading deforestation data:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
