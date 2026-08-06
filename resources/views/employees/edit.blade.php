@extends('layouts.app')

@section('title', 'Edit Employee')
@section('page_title', 'Edit Employee')

@section('content')
@include('employees._form', ['employee' => $employee])
@endsection
