import { Routes } from '@angular/router';
import { SessionList } from './pages/session-list/session-list';
import { SessionDetail } from './pages/session-detail/session-detail';
import { SessionForm } from './pages/session-form/session-form';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Profile } from './pages/profile/profile';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: SessionList },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'sessions/new', component: SessionForm, canActivate: [authGuard] },
  { path: 'sessions/:id', component: SessionDetail },
  { path: '**', redirectTo: '' },
];
