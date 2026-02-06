import AdminLayout from "@/components/admin/AdminLayout";
import { AdminDisputas } from "@/components/admin/AdminDisputas";
import { AdminSuspensoes } from "@/components/admin/AdminSuspensoes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminOperacoes = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Operações</h2>

        <Tabs defaultValue="disputas">
          <TabsList>
            <TabsTrigger value="disputas">Disputas</TabsTrigger>
            <TabsTrigger value="suspensoes">Suspensões</TabsTrigger>
          </TabsList>
          <TabsContent value="disputas" className="mt-4">
            <AdminDisputas />
          </TabsContent>
          <TabsContent value="suspensoes" className="mt-4">
            <AdminSuspensoes />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminOperacoes;
