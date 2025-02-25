import { cn } from "../../lib/utils";

function MyComponent() {
  const classNames = cn("base", {
    "text-red-500": true,
    "bg-blue-500": false,
  });

  return <div className={classNames}>Hello</div>;
}

export default MyComponent;