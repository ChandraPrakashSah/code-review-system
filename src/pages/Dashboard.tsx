import { useEffect, useState } from 'react';
import { Button, Card, Table, TableHeader, TableBody, TableRow, TableCell, TableColumn } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

interface User {
  name: string;
  email: string;
}

const Dashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers(storedUsers);
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">User Management Dashboard</h2>
        <Button size="sm" variant="flat" color="primary" onPress={() => navigate('/reviews')}>
          🤖 Code Review Log
        </Button>
      </div>
      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableColumn>Name</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={index}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Button size="sm" variant="flat" className="mr-2">Edit</Button>
                  <Button size="sm" variant="flat" color="danger">Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Dashboard;
