import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UserMenu() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    signOut();
    navigate("/signin");
  };

  if (!user) return null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
        <span className="user-name">{user.name}</span>
        <span className={`user-chevron ${open ? "open" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <p className="user-menu-role">
            Signed as {isAdmin ? "admin" : "user"}
          </p>
          <p className="user-menu-email">{user.email}</p>
          <button type="button" className="user-menu-signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
