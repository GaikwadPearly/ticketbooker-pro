import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface MovieCardProps {
  id: string;
  title: string;
  genre: string;
  rating: string;
  duration: number;
  posterUrl?: string;
}

export const MovieCard = ({ id, title, genre, rating, duration, posterUrl }: MovieCardProps) => {
  return (
    <Link to={`/movie/${id}`}>
      <Card className="overflow-hidden transition-all hover:scale-105 hover:shadow-[var(--shadow-glow)] bg-card border-border group">
        <div className="aspect-[2/3] bg-secondary relative overflow-hidden">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-6xl">🎬</span>
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              {rating}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-1">{title}</h3>
          <p className="text-muted-foreground text-sm mb-2">{genre}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{duration} min</span>
        </CardFooter>
      </Card>
    </Link>
  );
};
