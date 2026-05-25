import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Discover } from './pages/discover/discover';
import { MapPage } from './pages/map/map-page';
import { SessionDetail } from './pages/session-detail/session-detail';
import { SessionForm } from './pages/session-form/session-form';
import { SessionsLayout } from './pages/sessions-layout/sessions-layout';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Profile } from './pages/profile/profile';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { Admin } from './pages/admin/admin';
import { Inbox } from './pages/inbox/inbox';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'discover', component: Discover },
  { path: 'map', component: MapPage },
  {
    path: 'sessions',
    component: SessionsLayout,
    children: [
      { path: 'new', component: SessionForm, canActivate: [authGuard] },
      { path: ':id/edit', component: SessionForm, canActivate: [authGuard] },
      { path: ':id', component: SessionDetail },
      { path: '', redirectTo: '/discover', pathMatch: 'full' },
    ],
  },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'admin', component: Admin, canActivate: [adminGuard] },
  { path: 'inbox', component: Inbox, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
