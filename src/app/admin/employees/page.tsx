"use client";

import { useEffect, useState } from "react";
import { deleteUserDoc, listUsers, updateUser } from "@/lib/db";
import { UserProfile } from "@/types";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { Trash2, Shield, User as UserIcon } from "lucide-react";

export default function EmployeesPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setUsers(await listUsers());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggleRole = async (u: UserProfile) => {
    await updateUser(u.id, { role: u.role === "admin" ? "employee" : "admin" });
    await refresh();
  };

  const updateHours = async (u: UserProfile, hours: number) => {
    await updateUser(u.id, { plannedHoursPerWeek: hours });
    await refresh();
  };

  const toggleActive = async (u: UserProfile) => {
    await updateUser(u.id, { active: u.active === false ? true : false });
    await refresh();
  };

  const remove = async (u: UserProfile) => {
    if (!confirm(`Remove profile for ${u.name}? (The Firebase Auth account must be deleted from the Firebase Console.)`)) return;
    await deleteUserDoc(u.id);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Employees</h1>
        <p className="text-slate-500">
          Employees sign up themselves from the login page. Here you can manage roles, planned hours, and active status.
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6 text-center text-slate-500 text-sm">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No users yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Email</th>
                    <th className="text-left px-5 py-3">Role</th>
                    <th className="text-left px-5 py-3">Planned h/wk</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleRole(u)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.role === "admin" ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          {u.role}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          defaultValue={u.plannedHoursPerWeek ?? 40}
                          min={0}
                          max={80}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v) && v !== u.plannedHoursPerWeek) updateHours(u, v);
                          }}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleActive(u)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            u.active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {u.active === false ? "Inactive" : "Active"}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => remove(u)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
