export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-red-500 bg-red-50';
    case 'medium':
      return 'text-yellow-500 bg-yellow-50';
    case 'low':
      return 'text-green-500 bg-green-50';
    default:
      return 'text-gray-500 bg-gray-50';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'in-progress':
      return 'bg-blue-100 text-blue-700';
    case 'todo':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};