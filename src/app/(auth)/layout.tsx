interface Props {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#dadde2_1px,transparent_1px)] dark:bg-[radial-gradient(#393e4a_1px,transparent_1px)] [background-size:16px_16px]" />
      <div>{children}</div>
    </div>
  );
};

export default AuthLayout;
