import { db } from "@/lib/db";
import { ProfileForm } from "./client";

export default async function ProfilePage() {
  // Try to find the first admin. If not exists, we'll create a default one for the purpose of this demonstration.
  let admin = await db.admin.findFirst();

  if (!admin) {
    admin = await db.admin.create({
      data: {
        phone: "998901234567",
        password: "123",
      },
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profil</h2>
        <p className="text-muted-foreground">
          Tizim boshqaruvchisi ma'lumotlarini tahrirlash.
        </p>
      </div>

      <div className="rounded-md border bg-white p-6 shadow-sm">
        <ProfileForm admin={admin} />
      </div>
    </div>
  );
}
