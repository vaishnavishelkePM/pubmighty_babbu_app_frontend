import EditUserView from 'src/sections/dashboard/users/edit-users-view';

export default function EditUserViewPage({ params }) {
  return <EditUserView id={params?.id} />;
}
