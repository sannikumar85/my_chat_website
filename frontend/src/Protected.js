import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkUserAuth } from "./services/user.services";
import Loader from "./utils/Loader";
// import Loader from "../../utils/Loader";







export const ProtectedRoute = () => {
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const { isAuthenticated, setUser, clearUser } = useUserStore();

    useEffect(() => {
        // If we already know the user is authenticated in the local store
        // there's no need to call the server immediately (avoids race during login)
        if (isAuthenticated) {
            setIsChecking(false);
            return;
        }

        const verifyAuth = async () => {
            try {
                const result = await checkUserAuth();
                if (result?.isAuthenticated) {
                    setUser(result.user);
                } else {
                    clearUser();
                }
            } catch (error) {
                console.error("Error verifying user authentication:", error);
                clearUser();
            } finally {
                setIsChecking(false);
            }
        };

        verifyAuth();
    }, [isAuthenticated, setUser, clearUser]);
    if(isChecking) {
        return <Loader/>;

    }

    if(!isAuthenticated) {
        return <Navigate to="/user-login" state={{ from: location }} replace />;
    }

    //user is auth then render the protected route 
    return <Outlet/>;

};


export const PublicRoute = () => {
    const  isAuthenticated  = useUserStore(state => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
