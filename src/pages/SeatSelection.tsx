import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Monitor } from "lucide-react";

export default function SeatSelection() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [showtime, setShowtime] = useState<any>(null);
  const [movie, setMovie] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session?.user);
    });

    fetchShowtimeAndSeats();
  }, [showtimeId]);

  const fetchShowtimeAndSeats = async () => {
    const { data: showtimeData } = await supabase
      .from("showtimes")
      .select("*, movies(*)")
      .eq("id", showtimeId)
      .single();

    if (showtimeData) {
      setShowtime(showtimeData);
      setMovie(showtimeData.movies);

      let { data: seatsData } = await supabase
        .from("seats")
        .select("*")
        .eq("showtime_id", showtimeId)
        .order("row_letter")
        .order("seat_number");

      // If no seats exist, initialize them
      if (!seatsData || seatsData.length === 0) {
        await supabase.rpc("initialize_seats", {
          p_showtime_id: showtimeId,
          p_total_seats: showtimeData.total_seats,
        });

        const { data: newSeatsData } = await supabase
          .from("seats")
          .select("*")
          .eq("showtime_id", showtimeId)
          .order("row_letter")
          .order("seat_number");

        seatsData = newSeatsData;
      }

      if (seatsData) {
        setSeats(seatsData);
      }
    }
  };

  const toggleSeat = (seatId: string, isBooked: boolean) => {
    if (isBooked) return;

    const newSelected = new Set(selectedSeats);
    if (newSelected.has(seatId)) {
      newSelected.delete(seatId);
    } else {
      newSelected.add(seatId);
    }
    setSelectedSeats(newSelected);
  };

  const handleBooking = async () => {
    if (selectedSeats.size === 0) {
      toast({
        title: "No seats selected",
        description: "Please select at least one seat",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);

    try {
      const totalAmount = selectedSeats.size * showtime.price;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          showtime_id: showtimeId,
          total_amount: totalAmount,
          status: "confirmed",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Update seats
      const seatIds = Array.from(selectedSeats);
      const { error: seatsError } = await supabase
        .from("seats")
        .update({ is_booked: true, booking_id: booking.id })
        .in("id", seatIds);

      if (seatsError) throw seatsError;

      // Create booking_seats entries
      const bookingSeats = seatIds.map((seatId) => ({
        booking_id: booking.id,
        seat_id: seatId,
      }));

      const { error: junctionError } = await supabase
        .from("booking_seats")
        .insert(bookingSeats);

      if (junctionError) throw junctionError;

      // Update available seats count
      const newAvailableSeats = showtime.available_seats - selectedSeats.size;
      await supabase
        .from("showtimes")
        .update({ available_seats: newAvailableSeats })
        .eq("id", showtimeId);

      toast({
        title: "Booking confirmed!",
        description: `Successfully booked ${selectedSeats.size} seat(s)`,
      });

      navigate("/bookings");
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const groupedSeats = seats.reduce((acc, seat) => {
    if (!acc[seat.row_letter]) {
      acc[seat.row_letter] = [];
    }
    acc[seat.row_letter].push(seat);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container mx-auto px-4 py-8">
        {movie && showtime && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>
            <p className="text-muted-foreground">
              {showtime.theater_name} • {showtime.show_date} at {showtime.show_time}
            </p>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Screen */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Monitor className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Screen</span>
            </div>
            <div className="h-2 bg-gradient-to-b from-accent/50 to-transparent rounded-t-full" />
          </div>

          {/* Seats Grid */}
          <div className="space-y-4 mb-8">
            {Object.entries(groupedSeats).map(([row, rowSeats]: [string, any[]]) => (
              <div key={row} className="flex items-center gap-4">
                <div className="w-8 text-center font-bold text-muted-foreground">
                  {row}
                </div>
                <div className="flex-1 flex justify-center gap-2 flex-wrap">
                  {rowSeats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => toggleSeat(seat.id, seat.is_booked)}
                      disabled={seat.is_booked}
                      className={`
                        w-10 h-10 rounded-t-lg border-2 transition-all text-xs font-bold
                        ${
                          seat.is_booked
                            ? "bg-booked border-booked cursor-not-allowed opacity-50"
                            : selectedSeats.has(seat.id)
                            ? "bg-selected border-selected text-white scale-110"
                            : "bg-available border-available hover:scale-105"
                        }
                      `}
                    >
                      {seat.seat_number}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-available border-2 border-available rounded-t-lg" />
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-selected border-2 border-selected rounded-t-lg" />
              <span className="text-sm">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-booked border-2 border-booked rounded-t-lg opacity-50" />
              <span className="text-sm">Booked</span>
            </div>
          </div>

          {/* Booking Summary */}
          {selectedSeats.size > 0 && (
            <Card className="sticky bottom-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {selectedSeats.size} seat(s) selected
                    </p>
                    <p className="text-2xl font-bold">
                      Total: ${(selectedSeats.size * (showtime?.price || 0)).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleBooking}
                    disabled={isBooking}
                  >
                    {isBooking ? "Processing..." : "Confirm Booking"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
