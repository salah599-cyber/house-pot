import { CreateGameForm } from "@/components/games/create-game-form";
import { getAllPlatformSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewGamePage() {
  const settings = await getAllPlatformSettings();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create a cash game</CardTitle>
        <CardDescription>
          You are automatically seated as host. The first players to confirm online fill the
          remaining seats.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateGameForm
          defaults={{
            currency: settings.default_currency,
            defaultBuyIn: settings.default_buy_in,
            maxPlayers: settings.default_max_players,
          }}
        />
      </CardContent>
    </Card>
  );
}
